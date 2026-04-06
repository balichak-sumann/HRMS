import React, { useState } from 'react';
import { X, Loader2, Trash2, Camera } from 'lucide-react';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import CameraCaptureModal from '../CameraCaptureModal';

const AddEmployeeModal = ({ isOpen, onClose, onRefresh, employeeData = null }) => {
    const { profile } = useAuth();
    const isAdminUser = profile?.role === 'admin';
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState(employeeData || {
        full_name: '',
        email: '',
        account_role: 'employee',
        role: '',
        employee_id: '',
        designation: '',
        department: 'Unassigned',
        location: '',
        phone: '',
        dob: '',
        joining_date: '',
        salary: '',
        personal_email: '',
        emergency_contact: '',
        technology: '',
        experience_years: '',
        aadhaar_card: '',
        pan: '',
        bank_account: '',
        bank_name: '',
        department_id: '',
        manager_id: '',
        onboarding_template_id: ''
    });
    const [removeAvatar, setRemoveAvatar] = useState(false);
    const [avatarFile, setAvatarFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(employeeData?.avatar_url || null);
    const [showCameraModal, setShowCameraModal] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [managerOptions, setManagerOptions] = useState([]);
    const jobRoleRegex = /^[A-Za-z][A-Za-z\s.&'/-]*$/;
    const aadhaarRegex = /^\d{12}$/;
    const panRegex = /^[A-Z]{5}\d{4}[A-Z]$/;
    const bankAccountRegex = /^\d{9,18}$/;
    const emergencyContactRegex = /^\d{10}$/;
    const phoneRegex = /^(\d{10}|\+91\d{10})$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const [employeeRoleOptions, setEmployeeRoleOptions] = useState([]);
    const [hrRoleOptions, setHrRoleOptions] = useState([]);

    const normalizePanByPosition = (rawValue) => {
        const source = String(rawValue || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
        let next = '';

        for (const ch of source) {
            const idx = next.length;
            const needsLetter = idx < 5 || idx === 9;
            const needsDigit = idx >= 5 && idx <= 8;
            if (needsLetter && /[A-Z]/.test(ch)) next += ch;
            if (needsDigit && /\d/.test(ch)) next += ch;
            if (next.length >= 10) break;
        }

        return next;
    };

    React.useEffect(() => {
        if (employeeData) {
            setFormData({
                ...employeeData,
                dob: employeeData.dob ? new Date(employeeData.dob).toISOString().split('T')[0] : '',
                joining_date: employeeData.joining_date ? new Date(employeeData.joining_date).toISOString().split('T')[0] : '',
                manager_id: employeeData.manager_id || employeeData.reporting_manager_id || '',
                department_id: employeeData.department_id || ''
            });
            setPreviewUrl(employeeData.avatar_url);
            return;
        }

        setFormData({
            full_name: '',
            email: '',
            account_role: 'employee',
            role: '',
            employee_id: '',
            designation: '',
            department: 'Unassigned',
            location: '',
            phone: '',
            dob: '',
            joining_date: '',
            salary: '',
            personal_email: '',
            emergency_contact: '',
            technology: '',
            experience_years: '',
            aadhaar_card: '',
            pan: '',
            bank_account: '',
            bank_name: '',
            department_id: '',
            manager_id: '',
            onboarding_template_id: ''
        });
        setPreviewUrl(null);
    }, [employeeData, isOpen]);

    React.useEffect(() => {
        const fetchLookups = async () => {
            if (!isOpen) return;
            try {
                const [templateData, departmentData, employeesData, empRoles, hrRoles] = await Promise.all([
                    api.get('/onboarding/templates').catch(() => []),
                    api.get('/departments').catch(() => []),
                    api.get('/employees').catch(() => []),
                    api.get('/lookups?category=EMPLOYEE_ROLE').catch(() => []),
                    api.get('/lookups?category=HR_ROLE').catch(() => [])
                ]);

                setTemplates(templateData || []);
                setDepartments(departmentData || []);
                setEmployeeRoleOptions(empRoles?.map(r => r.value) || []);
                setHrRoleOptions(hrRoles?.map(r => r.value) || []);
                setManagerOptions(
                    (employeesData || []).filter((emp) => {
                        if (employeeData && emp.id === employeeData.id) return false;
                        return (emp.account_role || '').toLowerCase() === 'hr';
                    })
                );

                if (!employeeData) {
                    const engineering = (departmentData || []).find((dep) => dep.name === 'Engineering');
                    if (engineering) {
                        setFormData((prev) => ({
                            ...prev,
                            department_id: prev.department_id || engineering.id,
                            department: prev.department && prev.department !== 'Unassigned' ? prev.department : engineering.name
                        }));
                    }
                }
            } catch (error) {
                console.error('Failed to load employee lookups', error);
                setTemplates([]);
                setDepartments([]);
                setManagerOptions([]);
            }
        };

        fetchLookups();
    }, [employeeData, isOpen]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;

        // Phone number validation: Allow only +, space, and digits
        if (name === 'phone') {
            const compact = String(value || '').replace(/[^\d+]/g, '');
            const hasPlusPrefix = compact.startsWith('+');
            const digitsOnly = compact.replace(/\+/g, '');
            const limitedDigits = digitsOnly.slice(0, hasPlusPrefix ? 12 : 10);
            const cleanedValue = `${hasPlusPrefix ? '+' : ''}${limitedDigits}`;
            setFormData(prev => ({ ...prev, [name]: cleanedValue }));
            return;
        }

        if (name === 'designation') {
            const cleanedValue = value.replace(/[^A-Za-z\s.&'/-]/g, '');
            setFormData(prev => ({ ...prev, [name]: cleanedValue }));
            return;
        }

        if (name === 'account_role') {
            setFormData((prev) => {
                const nextOptions = value === 'hr' ? hrRoleOptions : employeeRoleOptions;
                const nextRole = nextOptions.includes(prev.role) ? prev.role : nextOptions[0];
                return { ...prev, account_role: value, role: nextRole };
            });
            return;
        }

        if (name === 'aadhaar_card') {
            const cleanedValue = value.replace(/\D/g, '').slice(0, 12);
            setFormData(prev => ({ ...prev, [name]: cleanedValue }));
            return;
        }

        if (name === 'bank_account') {
            const cleanedValue = value.replace(/\D/g, '').slice(0, 18);
            setFormData(prev => ({ ...prev, [name]: cleanedValue }));
            return;
        }

        if (name === 'emergency_contact') {
            const cleanedValue = value.replace(/\D/g, '').slice(0, 10);
            setFormData(prev => ({ ...prev, [name]: cleanedValue }));
            return;
        }

        if (name === 'pan' || name === 'pan_card') {
            const cleanedValue = normalizePanByPosition(value);
            setFormData(prev => ({ ...prev, [name]: cleanedValue }));
            return;
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const selectedAccountType = String(formData.account_role || employeeData?.account_role || 'employee').toLowerCase();
    const baseRoleOptions = selectedAccountType === 'hr' ? hrRoleOptions : employeeRoleOptions;
    const roleOptions = formData.role && !baseRoleOptions.includes(formData.role)
        ? [formData.role, ...baseRoleOptions]
        : baseRoleOptions;

    const handleFileChange = (eOrFile) => {
        const file = eOrFile?.target?.files ? eOrFile.target.files[0] : eOrFile;
        if (file) {
            setAvatarFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setRemoveAvatar(false);
        }
    };

    const handleRemovePhoto = () => {
        setAvatarFile(null);
        setPreviewUrl(null);
        setRemoveAvatar(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const normalizedFullName = String(formData.full_name || '').trim();
        if (!normalizedFullName) {
            toast.error('Please enter full name');
            return;
        }

        const normalizedPhone = String(formData.phone || '').replace(/[\s-]/g, '').trim();
        if (!normalizedPhone || !phoneRegex.test(normalizedPhone)) {
            toast.error('Phone Number must be 10 digits or +91 followed by 10 digits.');
            return;
        }

        const normalizedRole = String(formData.role || '').trim();
        if (!normalizedRole || !jobRoleRegex.test(normalizedRole)) {
            toast.error('Role must contain only alphabets and valid separators (no numbers).');
            return;
        }

        const normalizedDesignation = String(formData.designation || '').trim();
        if (normalizedDesignation && !jobRoleRegex.test(normalizedDesignation)) {
            toast.error('Designation must contain only alphabets and valid separators (no numbers).');
            return;
        }

        const normalizedEmail = String(formData.email || '').trim().toLowerCase();
        if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
            toast.error('Please enter a valid work email address.');
            return;
        }

        const normalizedSalary = String(formData.salary || '').trim();
        if (!normalizedSalary) {
            toast.error('Annual Salary is required.');
            return;
        }

        const normalizedPersonalEmail = String(formData.personal_email || '').trim().toLowerCase();
        if (normalizedPersonalEmail && !emailRegex.test(normalizedPersonalEmail)) {
            toast.error('Please enter a valid personal email address.');
            return;
        }

        const normalizedAadhaar = String(formData.aadhaar_card || '').replace(/\s+/g, '').trim();
        if (normalizedAadhaar && !aadhaarRegex.test(normalizedAadhaar)) {
            toast.error('Aadhaar Number must be exactly 12 digits.');
            return;
        }

        const normalizedPan = String(formData.pan || formData.pan_card || '').replace(/\s+/g, '').toUpperCase().trim();
        if (normalizedPan && !panRegex.test(normalizedPan)) {
            toast.error('PAN Number must be in format ABCDE1234F.');
            return;
        }

        const normalizedBankAccount = String(formData.bank_account || '').replace(/\s+/g, '').trim();
        if (normalizedBankAccount && !bankAccountRegex.test(normalizedBankAccount)) {
            toast.error('Bank Account Number must be 9 to 18 digits.');
            return;
        }

        const normalizedEmergencyContact = String(formData.emergency_contact || '').replace(/\s+/g, '').trim();
        if (normalizedEmergencyContact && !emergencyContactRegex.test(normalizedEmergencyContact)) {
            toast.error('Emergency Contact Number must be exactly 10 digits.');
            return;
        }

        try {
            setLoading(true);
            const data = new FormData();
            Object.keys(formData).forEach(key => {
                let value = formData[key];
                if (key === 'full_name') value = normalizedFullName;
                if (key === 'phone') value = normalizedPhone;
                if (value !== '' && value !== null && value !== undefined) {
                    data.append(key, value);
                }
            });
            if (avatarFile) {
                data.append('avatar', avatarFile);
            } else if (removeAvatar) {
                data.append('remove_avatar', 'true');
            }

            if (employeeData) {
                await api.patch(`/employees/${employeeData.id}`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                toast.success('Employee profile updated successfully!');
            } else {
                const created = await api.post('/employees', data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                const createdType = (formData.account_role || 'employee') === 'hr' ? 'HR user' : 'employee';
                if (created?.credential_email_sent === false) {
                    toast.error(`${createdType} created, but credential email failed to send. Check SMTP settings.`);
                } else {
                    toast.success(`${createdType} created successfully! Credentials email sent.`);
                }
            }
            onRefresh();
            onClose();
            if (!employeeData) {
                setFormData({
                    full_name: '',
                    email: '',
                    account_role: 'employee',
                    role: '',
                    employee_id: '',
                    designation: '',
                    department: 'Unassigned',
                    location: '',
                    phone: '',
                    dob: '',
                    joining_date: '',
                    salary: '',
                    personal_email: '',
                    emergency_contact: '',
                    technology: '',
                    experience_years: '',
                    aadhaar_card: '',
                    pan: '',
                    bank_account: '',
                    bank_name: '',
                    department_id: '',
                    manager_id: '',
                    onboarding_template_id: ''
                });
                setAvatarFile(null);
                setPreviewUrl(null);
            }
        } catch (error) {
            toast.error(error.message || 'Action failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
            overflowY: 'auto'
        }}>
            <div className="card add-employee-modal-card" style={{ width: '100%', maxWidth: '760px', padding: '0', overflow: 'hidden', maxHeight: 'calc(100vh - 40px)', margin: 'auto 0' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '20px' }}>{employeeData ? 'Edit Employee Profile' : 'Add New Employee'}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="add-employee-modal-form" style={{ padding: '24px', overflowY: 'auto', maxHeight: 'calc(100vh - 140px)' }}>
                    <div className="add-employee-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '14px', fontWeight: '500' }}>Full Name <span style={{ color: 'red' }}>*</span></label>
                            <input
                                name="full_name"
                                type="text"
                                className="input-field"
                                placeholder="John Doe"
                                required
                                value={formData.full_name}
                                onChange={handleChange}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '14px', fontWeight: '500' }}>Email Address <span style={{ color: 'red' }}>*</span></label>
                            <input
                                name="email"
                                type="email"
                                className="input-field"
                                placeholder="john@indusinnovate.com"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                disabled={Boolean(employeeData)}
                                pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
                            />
                            {employeeData && (
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                                    Email cannot be changed once the account is created.
                                </p>
                            )}
                        </div>
                        {isAdminUser && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '14px', fontWeight: '500' }}>Account Type <span style={{ color: 'red' }}>*</span></label>
                                <select
                                    name="account_role"
                                    className="input-field"
                                    value={formData.account_role || 'employee'}
                                    onChange={handleChange}
                                >
                                    <option value="employee">Employee Login</option>
                                    <option value="hr">HR Login</option>
                                    {employeeData && <option value="admin">Admin Login</option>}
                                </select>
                            </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '14px', fontWeight: '500' }}>Role <span style={{ color: 'red' }}>*</span></label>
                            <select
                                name="role"
                                className="input-field"
                                required
                                value={formData.role}
                                onChange={handleChange}
                            >
                                <option value="">Select role</option>
                                {roleOptions.map((option) => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '14px', fontWeight: '500' }}>Employee Code</label>
                            <input
                                name="employee_id"
                                type="text"
                                className="input-field"
                                placeholder="IIT-EMP-001"
                                value={formData.employee_id || ''}
                                onChange={handleChange}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '14px', fontWeight: '500' }}>Designation</label>
                            <input
                                name="designation"
                                type="text"
                                className="input-field"
                                placeholder="Software Engineer"
                                value={formData.designation || ''}
                                onChange={handleChange}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '14px', fontWeight: '500' }}>Department</label>
                            <select
                                name="department_id"
                                className="input-field"
                                value={formData.department_id || ''}
                                onChange={(e) => {
                                    const selectedDepartment = departments.find((dep) => dep.id === e.target.value);
                                    setFormData((prev) => ({
                                        ...prev,
                                        department_id: e.target.value,
                                        department: selectedDepartment?.name || 'Unassigned'
                                    }));
                                }}
                            >
                                <option value="">Unassigned</option>
                                {departments.map((dep) => (
                                    <option key={dep.id} value={dep.id}>{dep.name}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '14px', fontWeight: '500' }}>Reporting Manager</label>
                            <select
                                name="manager_id"
                                className="input-field"
                                value={formData.manager_id || ''}
                                onChange={handleChange}
                                disabled={!employeeData && formData.account_role === 'hr'}
                            >
                                <option value="">{(!employeeData && formData.account_role === 'hr') ? 'Not required for HR account' : 'No manager'}</option>
                                {managerOptions.map((manager) => (
                                    <option key={manager.id} value={manager.id}>{manager.full_name}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '14px', fontWeight: '500' }}>Location</label>
                            <input
                                name="location"
                                type="text"
                                className="input-field"
                                placeholder="Hyderabad"
                                value={formData.location || ''}
                                onChange={handleChange}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '14px', fontWeight: '500' }}>Phone Number <span style={{ color: 'red' }}>*</span></label>
                            <input
                                name="phone"
                                type="tel"
                                className="input-field"
                                placeholder="9876543210 or +919876543210"
                                required
                                value={formData.phone}
                                onChange={handleChange}
                                inputMode="tel"
                                maxLength={13}
                                title="Enter 10 digits or +91 followed by 10 digits"
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '14px', fontWeight: '500' }}>Joining Date <span style={{ color: 'red' }}>*</span></label>
                            <input
                                name="joining_date"
                                type="date"
                                className="input-field"
                                required
                                value={formData.joining_date}
                                onChange={handleChange}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '14px', fontWeight: '500' }}>Date of Birth</label>
                            <input
                                name="dob"
                                type="date"
                                className="input-field"
                                value={formData.dob || ''}
                                onChange={handleChange}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '14px', fontWeight: '500' }}>Annual Salary (INR) <span style={{ color: 'red' }}>*</span></label>
                            <input
                                name="salary"
                                type="number"
                                className="input-field"
                                placeholder="Enter annual salary"
                                required
                                value={formData.salary}
                                onChange={handleChange}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '14px', fontWeight: '500' }}>Personal Email</label>
                            <input
                                name="personal_email"
                                type="email"
                                className="input-field"
                                placeholder="john.personal@gmail.com"
                                value={formData.personal_email || ''}
                                onChange={handleChange}
                                pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '14px', fontWeight: '500' }}>Emergency Contact</label>
                            <input
                                name="emergency_contact"
                                type="text"
                                className="input-field"
                                placeholder="9876543210"
                                value={formData.emergency_contact || ''}
                                onChange={handleChange}
                                inputMode="numeric"
                                maxLength={10}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '14px', fontWeight: '500' }}>Technology</label>
                            <input
                                name="technology"
                                type="text"
                                className="input-field"
                                placeholder="Frontend / Backend / QA"
                                value={formData.technology || ''}
                                onChange={handleChange}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '14px', fontWeight: '500' }}>Experience (Years)</label>
                            <input
                                name="experience_years"
                                type="number"
                                step="0.1"
                                min="0"
                                className="input-field"
                                placeholder="2.5"
                                value={formData.experience_years || ''}
                                onChange={handleChange}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '14px', fontWeight: '500' }}>Aadhaar Number</label>
                            <input
                                name="aadhaar_card"
                                type="text"
                                className="input-field"
                                placeholder="123412341234"
                                value={formData.aadhaar_card || ''}
                                onChange={handleChange}
                                inputMode="numeric"
                                minLength={12}
                                maxLength={12}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '14px', fontWeight: '500' }}>PAN Number</label>
                            <input
                                name="pan"
                                type="text"
                                className="input-field"
                                placeholder="ABCDE1234F"
                                value={formData.pan || ''}
                                onChange={handleChange}
                                maxLength={10}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '14px', fontWeight: '500' }}>Bank Account Number</label>
                            <input
                                name="bank_account"
                                type="text"
                                className="input-field"
                                placeholder="123456789012"
                                value={formData.bank_account || ''}
                                onChange={handleChange}
                                inputMode="numeric"
                                minLength={9}
                                maxLength={18}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '14px', fontWeight: '500' }}>Bank Name</label>
                            <input
                                name="bank_name"
                                type="text"
                                className="input-field"
                                placeholder="HDFC"
                                value={formData.bank_name || ''}
                                onChange={handleChange}
                            />
                        </div>
                        {!employeeData && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '14px', fontWeight: '500' }}>Onboarding Template (Optional)</label>
                                <select
                                    name="onboarding_template_id"
                                    className="input-field"
                                    value={formData.onboarding_template_id || ''}
                                    onChange={handleChange}
                                >
                                    <option value="">No template</option>
                                    {templates.map((template) => (
                                        <option key={template.id} value={template.id}>{template.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="employee-photo-field" style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: 'span 2' }}>
                            <label style={{ fontSize: '14px', fontWeight: '500' }}>Employee Photo</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '50%',
                                    background: '#F3F4F6',
                                    overflow: 'hidden',
                                    border: '2px solid var(--border)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {previewUrl ? (
                                        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                                            <img src={previewUrl.startsWith('blob:') ? previewUrl : `${previewUrl}`} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            <button
                                                type="button"
                                                onClick={handleRemovePhoto}
                                                style={{
                                                    position: 'absolute',
                                                    top: '4px',
                                                    right: '4px',
                                                    background: 'rgba(239, 68, 68, 0.9)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    padding: '4px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                title="Remove photo"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    ) : (
                                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No Photo</span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            style={{ fontSize: '14px', maxWidth: '180px' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowCameraModal(true)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                border: '1px solid var(--border)',
                                                background: 'var(--card-bg)',
                                                cursor: 'pointer',
                                                fontSize: '14px',
                                                color: 'var(--text-muted)'
                                            }}
                                        >
                                            <Camera size={14} />
                                            Take Photo
                                        </button>
                                    </div>
                                    {previewUrl && (
                                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                                            Click the trash icon to remove the current photo.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                        <button type="button" onClick={onClose} disabled={loading} style={{
                            padding: '10px 20px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            background: '#F3F4F6',
                            color: '#000000',
                            fontWeight: '500',
                            cursor: 'pointer'
                        }}>
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 20px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'var(--primary)',
                            color: 'white',
                            fontWeight: '600',
                            cursor: 'pointer',
                            opacity: loading ? 0.7 : 1
                        }}>
                            {loading && <Loader2 size={18} className="animate-spin" />}
                            {loading ? (employeeData ? 'Updating...' : 'Creating...') : (employeeData ? 'Update Profile' : 'Create Employee')}
                        </button>
                    </div>
                </form>
            </div>
            <style>{`
                @media (max-width: 768px) {
                    .add-employee-grid {
                        grid-template-columns: 1fr !important;
                        gap: 14px !important;
                    }

                    .employee-photo-field {
                        grid-column: span 1 !important;
                    }

                    .add-employee-modal-card {
                        max-height: calc(100vh - 20px) !important;
                    }

                    .add-employee-modal-form {
                        max-height: calc(100vh - 120px) !important;
                    }
                }
            `}</style>

            <CameraCaptureModal
                isOpen={showCameraModal}
                onClose={() => setShowCameraModal(false)}
                onCapture={handleFileChange}
            />
        </div>
    );
};

export default AddEmployeeModal;
