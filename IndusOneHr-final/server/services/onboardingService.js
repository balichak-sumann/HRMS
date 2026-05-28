const createOnboardingCaseFromTemplate = async ({ client, employeeId, templateId, assignedBy = null }) => {
    const templateRes = await client.query(
        'SELECT id, name FROM onboarding_templates WHERE id = $1',
        [templateId]
    );

    if (templateRes.rows.length === 0) {
        throw new Error('Onboarding template not found');
    }

    const existingActive = await client.query(
        `SELECT id FROM onboarding_cases
         WHERE employee_id = $1 AND status = 'active'
         LIMIT 1`,
        [employeeId]
    );

    if (existingActive.rows.length > 0) {
        throw new Error('Employee already has an active onboarding case');
    }

    const caseRes = await client.query(
        `INSERT INTO onboarding_cases (employee_id, template_id, status, assigned_by, started_at)
         VALUES ($1, $2, 'active', $3, NOW())
         RETURNING *`,
        [employeeId, templateId, assignedBy]
    );

    const templateTasksRes = await client.query(
        `SELECT id, title, description, requires_document, sort_order
         FROM onboarding_template_tasks
         WHERE template_id = $1
         ORDER BY sort_order ASC, created_at ASC`,
        [templateId]
    );

    const caseId = caseRes.rows[0].id;
    for (const task of templateTasksRes.rows) {
        await client.query(
            `INSERT INTO onboarding_case_tasks
             (case_id, template_task_id, title, description, requires_document, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                caseId,
                task.id,
                task.title,
                task.description || null,
                task.requires_document || false,
                task.sort_order || 0
            ]
        );
    }

    return caseRes.rows[0];
};

module.exports = {
    createOnboardingCaseFromTemplate
};
