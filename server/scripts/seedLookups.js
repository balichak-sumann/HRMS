require('dotenv').config({ path: __dirname + '/../.env' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const legacyLookups = [
    { category: 'EMPLOYEE_ROLE', values: [
        'Software Engineer', 'Senior Software Engineer', 'Frontend Developer', 
        'Backend Developer', 'Full Stack Developer', 'QA Engineer', 
        'DevOps Engineer', 'Business Analyst', 'Product Manager', 'UI/UX Designer'] 
    },
    { category: 'HR_ROLE', values: [
        'HR Manager', 'HR Executive', 'HR Generalist', 
        'Talent Acquisition Specialist', 'HR Business Partner'] 
    },
    { category: 'LEAVE_TYPE', values: ['Casual', 'Sick', 'Earned'] },
    { category: 'ASSET_TYPE', values: ['Laptop', 'Monitor', 'Mobile', 'Keyboard', 'Mouse', 'Tablet'] },
    { category: 'OFFBOARDING_REASON', values: [
        'Career Readjustment', 'Health Issues', 'Continuing Education', 
        'Relocation', 'Better Opportunity', 'Personal Reasons'] 
    },
    { category: 'SURVEY_TYPE', values: [
        'Employee Satisfaction', 'Onboarding Feedback', 'Exit Interview', 
        'Training Evaluation', 'Performance Check-in'] 
    },
    { category: 'CLEARANCE_ROLE', values: ['IT', 'Finance', 'HR'] },
    { category: 'COMPLAINT_CATEGORY', values: ['HR', 'Harassment', 'Workload', 'Technical', 'Ethics', 'Infrastructure', 'Other'] },
    { category: 'EXPENSE_CATEGORY', values: ['Travel', 'Food', 'Equipment', 'Medical', 'Office Supplies', 'Other'] },
    { category: 'ASSET_STATUS', values: ['available', 'assigned', 'damaged', 'retired'] },
    { category: 'DEPARTMENT', values: ['Engineering', 'Human Resources', 'Sales', 'Marketing', 'Finance', 'Operations', 'Administration'] },
    // The explicit Tax deductions mapped for EmployeeTaxDeclarationPage.
    { category: 'TAX_SECTION', values: ['80C', '80D', '80DD', '80DDB', '80E', '80G', '80TTA'] }
];

async function seed() {
    try {
        console.log('[System Lookups] Seeding database variables...');
        for (const group of legacyLookups) {
            let sortOrder = 0;
            for (const val of group.values) {
                // Upsert to ensure array idempotency natively!
                await pool.query(
                    `INSERT INTO system_lookups (category, value, sort_order)
                     VALUES ($1, $2, $3)
                     ON CONFLICT (category, value) DO NOTHING`,
                    [group.category, val, sortOrder++]
                );
            }
        }
        console.log('[System Lookups] Seeding execution successful!');
    } catch (err) {
        console.error('[System Lookups] Error seeding legacy variables:', err);
    } finally {
        pool.end();
    }
}

seed();
