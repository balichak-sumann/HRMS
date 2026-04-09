const { Pool } = require('../db');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const resolveEmployee = async (req, client = pool) => {
    if (req.user?.employee_uuid) {
        const byUuid = await client.query(
            'SELECT id, full_name, email, department_id FROM employees WHERE id = $1 LIMIT 1',
            [req.user.employee_uuid]
        );
        if (byUuid.rows[0]) return byUuid.rows[0];
    }

    const byProfile = await client.query(
        `SELECT e.id, e.full_name, e.email, e.department_id
         FROM employees e
         JOIN profiles p ON e.email = p.email OR (e.employee_id IS NOT NULL AND e.employee_id = p.employee_id)
         WHERE p.id = $1
         LIMIT 1`,
        [req.user.id]
    );
    return byProfile.rows[0] || null;
};

const isVisibleToEmployee = async (surveyId, employee, client = pool) => {
    const result = await client.query(
        `SELECT s.id
         FROM surveys s
         WHERE s.id = $1
           AND s.status = 'active'
           AND (s.deadline IS NULL OR s.deadline >= CURRENT_DATE)
           AND (
                s.target_type = 'all'
                OR (s.target_type = 'department' AND s.target_department_id = $2)
           )
         LIMIT 1`,
        [surveyId, employee.department_id]
    );

    return result.rows.length > 0;
};

const validateQuestion = (question) => {
    const allowedTypes = ['rating', 'mcq', 'text'];
    if (!question?.question_text || !allowedTypes.includes(question.question_type)) {
        return 'Each question requires question_text and valid question_type';
    }

    if (question.question_type === 'mcq') {
        if (!Array.isArray(question.options) || question.options.filter(Boolean).length < 2) {
            return 'MCQ questions require at least 2 options';
        }
    }

    return null;
};

const hasColumn = async (client, tableName, columnName) => {
    const result = await client.query(
        `SELECT COUNT(*) AS count
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = $1
           AND COLUMN_NAME = $2`,
        [tableName, columnName]
    );

    return Number(result.rows?.[0]?.count || 0) > 0;
};

const createSurvey = async (req, res) => {
    const {
        title,
        description,
        target_type = 'all',
        target_department_id,
        is_anonymous = false,
        survey_type,
        deadline,
        questions = [],
    } = req.body;

    if (!title || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ error: 'title and at least one question are required' });
    }

    if (!['all', 'department'].includes(target_type)) {
        return res.status(400).json({ error: 'target_type must be all or department' });
    }

    if (target_type === 'department' && !target_department_id) {
        return res.status(400).json({ error: 'target_department_id is required for department surveys' });
    }

    if (survey_type !== undefined && survey_type !== null && typeof survey_type !== 'string') {
        return res.status(400).json({ error: 'survey_type must be a string when provided' });
    }

    for (const question of questions) {
        const error = validateQuestion(question);
        if (error) return res.status(400).json({ error });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const creator = await resolveEmployee(req, client);
        const hasSurveyTypeColumn = await hasColumn(client, 'surveys', 'survey_type');

        const insertColumns = [
            'title',
            'description',
            'created_by',
            'target_type',
            'target_department_id',
            'is_anonymous',
            'deadline',
        ];

        const insertValues = [
            title,
            description || null,
            creator?.id || null,
            target_type,
            target_type === 'department' ? target_department_id : null,
            !!is_anonymous,
            deadline || null,
        ];

        if (hasSurveyTypeColumn) {
            insertColumns.push('survey_type');
            insertValues.push(survey_type || null);
        }

        insertColumns.push('status');
        insertValues.push('draft');

        const placeholders = insertValues.map((_, index) => `$${index + 1}`).join(', ');
        const surveyResult = await client.query(
            `INSERT INTO surveys
             (${insertColumns.join(', ')})
             VALUES (${placeholders})
             RETURNING *`,
            insertValues
        );

        const survey = surveyResult.rows[0];
        const createdQuestions = [];

        for (let i = 0; i < questions.length; i += 1) {
            const q = questions[i];
            const cleanedOptions = q.question_type === 'mcq'
                ? JSON.stringify((q.options || []).map((opt) => String(opt).trim()).filter(Boolean))
                : null;

            const questionResult = await client.query(
                `INSERT INTO survey_questions
                 (survey_id, question_text, question_type, options_json, order_index)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING *`,
                [
                    survey.id,
                    q.question_text,
                    q.question_type,
                    cleanedOptions,
                    Number.isFinite(Number(q.order_index)) ? Number(q.order_index) : i + 1,
                ]
            );

            createdQuestions.push(questionResult.rows[0]);
        }

        await client.query('COMMIT');
        res.status(201).json({ ...survey, questions: createdQuestions });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('createSurvey error:', err.message, err.stack);
        const message = err.message || 'Server error';
        res.status(500).json({ error: message });
    } finally {
        client.release();
    }
};

const publishSurvey = async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const surveyResult = await client.query('SELECT * FROM surveys WHERE id = $1 LIMIT 1', [id]);
        if (surveyResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Survey not found' });
        }

        const survey = surveyResult.rows[0];
        if (survey.status === 'active') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Survey is already active' });
        }

        const questionCount = await client.query(
            'SELECT COUNT(*)::int AS count FROM survey_questions WHERE survey_id = $1',
            [id]
        );
        if ((questionCount.rows[0]?.count || 0) === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Survey must have at least one question before publishing' });
        }

        const updated = await client.query(
            `UPDATE surveys
             SET status = 'active'
             WHERE id = $1
             RETURNING *`,
            [id]
        );

        let targetProfiles;
        if (survey.target_type === 'department') {
            targetProfiles = await client.query(
                `SELECT DISTINCT p.id AS profile_id
                 FROM profiles p
                 JOIN employees e
                   ON e.email = p.email OR (e.employee_id IS NOT NULL AND e.employee_id = p.employee_id)
                 WHERE p.role = 'employee'
                   AND COALESCE(p.status, 'active') = 'active'
                   AND e.department_id = $1`,
                [survey.target_department_id]
            );
        } else {
            targetProfiles = await client.query(
                `SELECT id AS profile_id
                 FROM profiles
                 WHERE role = 'employee'
                   AND COALESCE(status, 'active') = 'active'`
            );
        }

        const notificationRows = [];
        for (const row of targetProfiles.rows) {
            const notificationResult = await client.query(
                `INSERT INTO notifications (user_id, title, message, type)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id, user_id, title, message, type, is_read, created_at`,
                [
                    row.profile_id,
                    `New Survey: ${survey.title}`,
                    'A new survey is available. Please submit your response before the deadline.',
                    'survey',
                ]
            );
            notificationRows.push(notificationResult.rows[0]);
        }

        await client.query('COMMIT');

        if (req.io) {
            for (const n of notificationRows) {
                req.io.to(n.user_id).emit('notification_created', n);
            }
        }

        res.json(updated.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('publishSurvey error:', err.message);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
};

const getSurveys = async (req, res) => {
    try {
        if (['hr', 'admin'].includes(req.user.role)) {
            const result = await pool.query(
                `SELECT s.*, e.full_name AS created_by_name, d.name AS target_department_name,
                        COUNT(sr.id)::int AS response_count
                 FROM surveys s
                 LEFT JOIN employees e ON e.id = s.created_by
                 LEFT JOIN departments d ON d.id = s.target_department_id
                 LEFT JOIN survey_responses sr ON sr.survey_id = s.id
                 GROUP BY s.id, e.full_name, d.name
                 ORDER BY s.created_at DESC`
            );
            return res.json(result.rows);
        }

        const employee = await resolveEmployee(req);
        if (!employee) return res.status(404).json({ error: 'Employee not found' });

        const result = await pool.query(
            `SELECT s.*, d.name AS target_department_name,
                    EXISTS(
                        SELECT 1
                        FROM survey_responses sr
                        WHERE sr.survey_id = s.id AND sr.employee_id = $1
                    ) AS has_responded
             FROM surveys s
             LEFT JOIN departments d ON d.id = s.target_department_id
             WHERE s.status = 'active'
               AND (s.deadline IS NULL OR s.deadline >= CURRENT_DATE)
               AND (
                   s.target_type = 'all'
                   OR (s.target_type = 'department' AND s.target_department_id = $2)
               )
             ORDER BY s.created_at DESC`,
            [employee.id, employee.department_id]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('getSurveys error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

const getSurveyById = async (req, res) => {
    const { id } = req.params;

    try {
        const surveyResult = await pool.query(
            `SELECT s.*, e.full_name AS created_by_name, d.name AS target_department_name
             FROM surveys s
             LEFT JOIN employees e ON e.id = s.created_by
             LEFT JOIN departments d ON d.id = s.target_department_id
             WHERE s.id = $1
             LIMIT 1`,
            [id]
        );

        if (surveyResult.rows.length === 0) {
            return res.status(404).json({ error: 'Survey not found' });
        }

        const survey = surveyResult.rows[0];

        if (!['hr', 'admin'].includes(req.user.role)) {
            const employee = await resolveEmployee(req);
            if (!employee) return res.status(404).json({ error: 'Employee not found' });

            const visible = await isVisibleToEmployee(id, employee);
            if (!visible) {
                return res.status(403).json({ error: 'Forbidden' });
            }

            const responded = await pool.query(
                `SELECT 1 FROM survey_responses WHERE survey_id = $1 AND employee_id = $2 LIMIT 1`,
                [id, employee.id]
            );
            survey.has_responded = responded.rows.length > 0;
        }

        const questions = await pool.query(
            `SELECT id, survey_id, question_text, question_type, options_json, order_index
             FROM survey_questions
             WHERE survey_id = $1
             ORDER BY order_index ASC, created_at ASC`,
            [id]
        );

        res.json({
            ...survey,
            questions: questions.rows.map((q) => ({
                ...q,
                options: q.options_json ? JSON.parse(q.options_json) : [],
            })),
        });
    } catch (err) {
        console.error('getSurveyById error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

const respondToSurvey = async (req, res) => {
    const { id } = req.params;
    const { answers = [] } = req.body;

    if (!Array.isArray(answers) || answers.length === 0) {
        return res.status(400).json({ error: 'answers are required' });
    }

    const client = await pool.connect();
    try {
        const employee = await resolveEmployee(req, client);
        if (!employee) return res.status(404).json({ error: 'Employee not found' });

        const visible = await isVisibleToEmployee(id, employee, client);
        if (!visible) {
            return res.status(403).json({ error: 'You are not allowed to respond to this survey' });
        }

        const existing = await client.query(
            'SELECT id FROM survey_responses WHERE survey_id = $1 AND employee_id = $2 LIMIT 1',
            [id, employee.id]
        );
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Survey already submitted' });
        }

        const questionResult = await client.query(
            `SELECT id, question_type, options_json
             FROM survey_questions
             WHERE survey_id = $1`,
            [id]
        );

        const byId = new Map(questionResult.rows.map((q) => [q.id, q]));

        await client.query('BEGIN');

        const responseResult = await client.query(
            `INSERT INTO survey_responses (survey_id, employee_id, submitted_at)
             VALUES ($1, $2, NOW())
             RETURNING *`,
            [id, employee.id]
        );

        const response = responseResult.rows[0];

        for (const item of answers) {
            const q = byId.get(item.question_id);
            if (!q) {
                throw new Error('Invalid question in answers payload');
            }

            const value = item.answer_text == null ? '' : String(item.answer_text).trim();
            if (!value) {
                throw new Error('Answer text cannot be empty');
            }

            if (q.question_type === 'rating') {
                const rating = Number(value);
                if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
                    throw new Error('Rating answers must be between 1 and 5');
                }
            }

            if (q.question_type === 'mcq') {
                const options = q.options_json ? JSON.parse(q.options_json) : [];
                if (!options.includes(value)) {
                    throw new Error('Invalid MCQ option selected');
                }
            }

            await client.query(
                `INSERT INTO survey_answers (response_id, question_id, answer_text)
                 VALUES ($1, $2, $3)`,
                [response.id, item.question_id, value]
            );
        }

        await client.query('COMMIT');
        res.status(201).json({ message: 'Survey submitted successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('respondToSurvey error:', err.message);
        const message = err.message === 'Server error' ? err.message : err.message;
        if (
            message.includes('Invalid') ||
            message.includes('cannot be empty') ||
            message.includes('Rating')
        ) {
            return res.status(400).json({ error: message });
        }
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
};

const getSurveyResults = async (req, res) => {
    const { id } = req.params;

    try {
        const surveyResult = await pool.query(
            `SELECT s.*, d.name AS target_department_name
             FROM surveys s
             LEFT JOIN departments d ON d.id = s.target_department_id
             WHERE s.id = $1
             LIMIT 1`,
            [id]
        );

        if (surveyResult.rows.length === 0) {
            return res.status(404).json({ error: 'Survey not found' });
        }

        const survey = surveyResult.rows[0];

        let targetCountResult;
        if (survey.target_type === 'department') {
            targetCountResult = await pool.query(
                `SELECT COUNT(*)::int AS count
                 FROM employees
                 WHERE department_id = $1`,
                [survey.target_department_id]
            );
        } else {
            targetCountResult = await pool.query(
                `SELECT COUNT(*)::int AS count
                 FROM profiles
                 WHERE role = 'employee' AND COALESCE(status, 'active') = 'active'`
            );
        }

        const responseCountResult = await pool.query(
            `SELECT COUNT(*)::int AS count
             FROM survey_responses
             WHERE survey_id = $1`,
            [id]
        );

        const questionsResult = await pool.query(
            `SELECT id, question_text, question_type, options_json, order_index
             FROM survey_questions
             WHERE survey_id = $1
             ORDER BY order_index ASC, created_at ASC`,
            [id]
        );

        const ratingAverages = await pool.query(
            `SELECT sa.question_id, ROUND(AVG(sa.answer_text::numeric), 2) AS average
             FROM survey_answers sa
             JOIN survey_responses sr ON sr.id = sa.response_id
             JOIN survey_questions sq ON sq.id = sa.question_id
             WHERE sr.survey_id = $1
               AND sq.question_type = 'rating'
             GROUP BY sa.question_id`,
            [id]
        );

        const mcqCounts = await pool.query(
            `SELECT sa.question_id, sa.answer_text, COUNT(*)::int AS count
             FROM survey_answers sa
             JOIN survey_responses sr ON sr.id = sa.response_id
             JOIN survey_questions sq ON sq.id = sa.question_id
             WHERE sr.survey_id = $1
               AND sq.question_type = 'mcq'
             GROUP BY sa.question_id, sa.answer_text`,
            [id]
        );

        const textAnswersResult = await pool.query(
            `SELECT sa.question_id,
                    sa.answer_text,
                    sr.submitted_at,
                    sr.employee_id,
                    e.full_name AS employee_name
             FROM survey_answers sa
             JOIN survey_responses sr ON sr.id = sa.response_id
             JOIN survey_questions sq ON sq.id = sa.question_id
             LEFT JOIN employees e ON e.id = sr.employee_id
             WHERE sr.survey_id = $1
               AND sq.question_type = 'text'
             ORDER BY sr.submitted_at DESC`,
            [id]
        );

        const ratingMap = new Map(ratingAverages.rows.map((row) => [row.question_id, Number(row.average)]));
        const mcqMap = new Map();
        for (const row of mcqCounts.rows) {
            const list = mcqMap.get(row.question_id) || [];
            list.push({ option: row.answer_text, count: row.count });
            mcqMap.set(row.question_id, list);
        }

        const textMap = new Map();
        for (const row of textAnswersResult.rows) {
            const list = textMap.get(row.question_id) || [];
            list.push(
                survey.is_anonymous
                    ? {
                        answer_text: row.answer_text,
                        submitted_at: row.submitted_at,
                    }
                    : {
                        answer_text: row.answer_text,
                        submitted_at: row.submitted_at,
                        employee_id: row.employee_id,
                        employee_name: row.employee_name,
                    }
            );
            textMap.set(row.question_id, list);
        }

        const questions = questionsResult.rows.map((q) => ({
            id: q.id,
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.options_json ? JSON.parse(q.options_json) : [],
            average_rating: ratingMap.get(q.id) || null,
            option_counts: mcqMap.get(q.id) || [],
            text_answers: textMap.get(q.id) || [],
        }));

        const targetCount = targetCountResult.rows[0]?.count || 0;
        const responseCount = responseCountResult.rows[0]?.count || 0;
        const responseRate = targetCount > 0 ? Number(((responseCount / targetCount) * 100).toFixed(2)) : 0;

        res.json({
            survey: {
                id: survey.id,
                title: survey.title,
                description: survey.description,
                status: survey.status,
                is_anonymous: survey.is_anonymous,
                deadline: survey.deadline,
                target_type: survey.target_type,
                target_department_name: survey.target_department_name,
                created_at: survey.created_at,
            },
            stats: {
                target_count: targetCount,
                response_count: responseCount,
                response_rate: responseRate,
            },
            questions,
        });
    } catch (err) {
        console.error('getSurveyResults error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    createSurvey,
    publishSurvey,
    getSurveys,
    getSurveyById,
    respondToSurvey,
    getSurveyResults,
};
