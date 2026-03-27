import React, { useState, useEffect } from 'react';
import {
    FileText, Download, Plus,
    History, Printer, Mail
} from 'lucide-react';
import {
    Document,
    Page,
    PDFDownloadLink,
    pdf,
    StyleSheet,
    Text,
    View,
    Image
} from '@react-pdf/renderer';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

const formatDisplayDate = (value) => {
    if (!value) return '________________';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const day = d.getDate();
    const month = d.toLocaleString('en-US', { month: 'long' });
    const year = d.getFullYear();
    const suffix = day % 10 === 1 && day !== 11 ? 'st' : day % 10 === 2 && day !== 12 ? 'nd' : day % 10 === 3 && day !== 13 ? 'rd' : 'th';
    return `${day}${suffix} ${month} ${year}`;
};

const formatIssueDate = (value) => {
    if (!value) return new Date().toLocaleDateString('en-GB');
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString('en-GB');
};

const toInr = (value) => {
    const n = Number(value || 0);
    if (!Number.isFinite(n) || n <= 0) return 'Unpaid';
    return `RS ${n.toLocaleString('en-IN')}`;
};

const styles = StyleSheet.create({
    page: {
        paddingTop: 20,
        paddingHorizontal: 34,
        paddingBottom: 60,
        fontFamily: 'Helvetica',
        fontSize: 10,
        color: '#1F2937',
        lineHeight: 1.35,
        position: 'relative'
    },
    headerContainer: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        gap: 10,
        marginBottom: 15,
        position: 'relative'
    },
    logo: {
        width: 50,
        height: 50
    },
    pageBgLogo: {
        position: 'absolute',
        top: '22%',
        left: '20%',
        width: 360,
        height: 360,
        opacity: 0.08
    },
    companyHeader: {
        flex: 1,
        textAlign: 'left'
    },
    company: {
        fontSize: 18,
        fontWeight: 700,
        color: '#063970',
        textTransform: 'uppercase',
        marginBottom: 2,
        textAlign: 'left'
    },
    tagline: {
        fontSize: 8.5,
        color: '#4B5563',
        marginBottom: 10,
        textAlign: 'center'
    },
    block: {
        marginBottom: 6
    },
    heading: {
        fontSize: 10.5,
        fontWeight: 700,
        marginTop: 5,
        marginBottom: 4
    },
    subHeading: {
        fontSize: 9.5,
        fontWeight: 700,
        marginTop: 3,
        marginBottom: 2
    },
    inlineBold: {
        fontWeight: 700
    },
    bulletRow: {
        flexDirection: 'row',
        marginBottom: 2
    },
    bulletDot: {
        width: 10,
        fontWeight: 700,
        fontSize: 10
    },
    bulletText: {
        flex: 1,
        fontSize: 10
    },
    numberedRow: {
        flexDirection: 'row',
        marginBottom: 2
    },
    numberedIndex: {
        width: 14,
        fontWeight: 700,
        fontSize: 10
    },
    numberedText: {
        flex: 1,
        fontSize: 10
    },
    table: {
        marginTop: 4,
        borderWidth: 1,
        borderColor: '#D1D5DB'
    },
    trHead: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderBottomWidth: 1,
        borderColor: '#D1D5DB',
        fontSize: 9
    },
    tr: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderColor: '#E5E7EB',
        fontSize: 9
    },
    tdComponent: {
        width: '48%',
        padding: 3
    },
    tdMonth: {
        width: '26%',
        textAlign: 'right',
        padding: 3
    },
    tdYear: {
        width: '26%',
        textAlign: 'right',
        padding: 3
    },
    ackLine: {
        marginTop: 10
    },
    footer: {
        position: 'absolute',
        left: 34,
        right: 34,
        bottom: 16,
        borderTopWidth: 1,
        borderColor: '#D1D5DB',
        paddingTop: 4,
        fontSize: 8,
        color: '#374151'
    }
});

const Footer = () => (
    <View style={styles.footer} fixed>
        <Text style={{ fontSize: 8, color: '#374151', marginBottom: 2 }}>
            Address: Panchsheel Complex, 2nd floor, 206, Nizampet, Hyderabad, Telangana – 500090
        </Text>
        <Text style={{ fontSize: 8, color: '#374151' }}>
            Contact – 9063063679    Hr@iit.org.in    www.iit.org.in
        </Text>
    </View>
);

const PageHeader = () => (
    <View style={styles.headerContainer}>
        <Image src="/logo.png" style={styles.logo} />
        <View style={styles.companyHeader}>
            <Text style={styles.company}>INDUSINNOVATE TECHNOLOGIES PRIVATE LIMITED</Text>
            <Text style={styles.tagline}>Innovating the future, the indus way</Text>
        </View>
    </View>
);

const PageBackground = () => (
    <Image src="/logo.png" style={styles.pageBgLogo} fixed />
);

const OfferLetterPDF = ({ data }) => {
    const role = data.role || 'Software Developer - L1';
    const positionTitle = data.position_title || role.split('-')[0].trim() || 'Software Developer';
    const candidateName = data.candidate_name || 'Candidate Name';
    const department = data.department || 'IT';
    const location = data.location || 'Hyderabad';
    const issueDate = formatIssueDate(data.issue_date);
    const joiningDate = formatDisplayDate(data.joining_date);
    const parsedCtc = Number(data.ctc);
    const annualCtc = Number.isFinite(parsedCtc) && parsedCtc > 0 ? parsedCtc : 0;
    const hasPaidCtc = annualCtc > 0;
    const ctcText = toInr(annualCtc);

    // Calculate salary components based on CTC using Indian salary structure
    const monthlyCtc = hasPaidCtc ? Math.round(annualCtc / 12) : 0;
    
    // Standard deductions/benefits (fixed amounts)
    const employeePfMonth = hasPaidCtc ? 1500 : 0;
    const insuranceMonth = hasPaidCtc ? 334 : 0;
    const professionalTaxMonth = hasPaidCtc ? 200 : 0;
    
    // Gross = CTC - (PF + Insurance)
    const grossMonth = hasPaidCtc ? Math.round(monthlyCtc - employeePfMonth - insuranceMonth) : 0;
    
    // Salary breakdown: Basic (55%), HRA (27.8%), Conveyance (fixed), Special (rest)
    const basicPayMonth = hasPaidCtc ? Math.round((grossMonth * 55) / 100) : 0;
    const hraMonth = hasPaidCtc ? Math.round((grossMonth * 27.8) / 100) : 0;
    const conveyanceMonth = hasPaidCtc ? 1500 : 0; // Fixed when paid CTC is provided
    const specialAllowanceMonth = hasPaidCtc ? Math.round(grossMonth - basicPayMonth - hraMonth - conveyanceMonth) : 0;

    return (
        <Document>
            {/* PAGE 1 */}
            <Page size="A4" style={styles.page} wrap>
                <PageBackground />
                <PageHeader />

                <Text style={styles.block}>Date: {issueDate}</Text>
                <Text style={styles.block}>Dear {candidateName},</Text>

                <Text style={styles.block}>
                    We are thrilled to extend to you the offer of employment as a <Text style={styles.inlineBold}>{role}</Text> at INDUSINNOVATE Technologies Private Limited. Your exceptional skills, experience, and qualifications make you an ideal fit for our team, and we are excited about the opportunity to welcome you on board.
                </Text>
                <Text style={styles.block}>
                    This comprehensive offer letter outlines the terms and conditions of your employment with INDUSINNOVATE, as well as other pertinent information.
                </Text>

                <Text style={styles.heading}>Position Title: {positionTitle}</Text>
                <Text style={styles.block}>Department: {department}</Text>
                <Text style={styles.block}>StartDate: {joiningDate}</Text>
                <Text style={styles.block}>Location: {location}</Text>

                <Text style={styles.heading}>2. Compensation and Benefits:</Text>
                <Text style={styles.block}>
                    Your starting salary will be {ctcText} per annum which includes of all statutory deductions. Refer to the Annexure A for stack up details.
                </Text>

                <Text style={styles.heading}>3. Working Hours:</Text>
                <Text style={styles.block}>
                    Your typical work schedule will be Monday to Friday, starting at 9:00AM and ending at 6:00PM. Please note that occasional over time may be required based on project demands.
                </Text>

                <Text style={styles.heading}>4. Probationary Period:</Text>
                <Text style={styles.block}>
                    Your employment with INDUSINNOVATE will be subject to probation any period of 4 months. During this time, your performance and suitability for the role will be evaluated.
                </Text>

                <Text style={styles.heading}>5. Responsibilities:</Text>
                <Text style={styles.block}>
                    As a {positionTitle}, your primary responsibilities will include, but are not limited to:
                </Text>
                <View style={styles.bulletRow}><Text style={styles.bulletDot}>•</Text><Text style={styles.bulletText}>Developing high-quality software solutions Collaborating with cross-functional teams to design and implement software features</Text></View>
                <View style={styles.bulletRow}><Text style={styles.bulletDot}>•</Text><Text style={styles.bulletText}>Trouble shooting and debugging software applications</Text></View>
                <View style={styles.bulletRow}><Text style={styles.bulletDot}>•</Text><Text style={styles.bulletText}>Writing clean, maintain able code following best practices</Text></View>
                <View style={styles.bulletRow}><Text style={styles.bulletDot}>•</Text><Text style={styles.bulletText}>Participating in code reviews and providing constructive feedback</Text></View>
                <View style={styles.bulletRow}><Text style={styles.bulletDot}>•</Text><Text style={styles.bulletText}>Staying updated on emerging technologies and industry trends</Text></View>

                <Text style={styles.heading}>6. Intellectual Property and Confidentiality:</Text>
                <Text style={styles.block}>
                    As an employee of INDUSINNOVATE, you will have access to confidential information and may be involved in the creation of intellectual property (IP) during the course of your employment. It is essential to understand and adhere to our policies regarding intellectual property and confidentiality to protect the interests of our company and our clients.
                </Text>

                <Text style={styles.subHeading}>Intellectual Property Ownership:</Text>
                <Text style={styles.block}>
                    Any intellectual property developed, created, or discovered by you during the term of your employment with INDUSINNOVATE, whether alone or in conjunction with others, will be considered
                </Text>

                <Footer />
            </Page>

            {/* PAGE 2 */}
            <Page size="A4" style={styles.page} wrap>
                <PageBackground />
                <PageHeader />

                <Text style={styles.block}>the exclusive property of the company. This includes but is not limited to:</Text>
                <View style={styles.numberedRow}><Text style={styles.numberedIndex}>1.</Text><Text style={styles.numberedText}>Software code</Text></View>
                <View style={styles.numberedRow}><Text style={styles.numberedIndex}>2.</Text><Text style={styles.numberedText}>Designs</Text></View>
                <View style={styles.numberedRow}><Text style={styles.numberedIndex}>3.</Text><Text style={styles.numberedText}>Inventions</Text></View>
                <View style={styles.numberedRow}><Text style={styles.numberedIndex}>4.</Text><Text style={styles.numberedText}>Processes</Text></View>
                <View style={styles.numberedRow}><Text style={styles.numberedIndex}>5.</Text><Text style={styles.numberedText}>Trade secrets</Text></View>
                <Text style={styles.block}>
                    You agree to promptly disclose all intellectual property created in the scope of your employment and to assign all rights, title, and interest in such intellectual property to INDUSINNOVATE. This ensures that our company maintains control and ownership over valuable assets developed during your tenure.
                </Text>

                <Text style={styles.subHeading}>Confidentiality Obligations:</Text>
                <Text style={styles.block}>
                    You will be trusted with confidential and proprietary information belonging to INDUSINNOVATE and our clients. This may include:
                </Text>
                <View style={styles.bulletRow}><Text style={styles.bulletDot}>•</Text><Text style={styles.bulletText}>Business strategies and plans</Text></View>
                <View style={styles.bulletRow}><Text style={styles.bulletDot}>•</Text><Text style={styles.bulletText}>Financial information</Text></View>
                <View style={styles.bulletRow}><Text style={styles.bulletDot}>•</Text><Text style={styles.bulletText}>Customer data</Text></View>
                <View style={styles.bulletRow}><Text style={styles.bulletDot}>•</Text><Text style={styles.bulletText}>Product designs and specifications</Text></View>
                <View style={styles.bulletRow}><Text style={styles.bulletDot}>•</Text><Text style={styles.bulletText}>Trade secrets</Text></View>
                <Text style={styles.block}>
                    You agree to maintain the confidentiality of all such information and to use it solely for the purpose of fulfilling your duties as an employee of INDUSINNOVATE. You are prohibited from disclosing, sharing, or using confidential information for personal gain or for the benefit of any third party.
                </Text>

                <Text style={styles.subHeading}>Non-Disclosure Agreement (NDA):</Text>
                <Text style={styles.block}>
                    Upon commencement of your employment, you will be required to sign a Non-Disclosure Agreement (NDA) affirming your commitment to maintaining the confidentiality of company information. The NDA outlines your obligations regarding the protection of confidential information and the consequences of breaching these obligations.
                </Text>

                <Text style={styles.subHeading}>Duty of Care:</Text>
                <Text style={styles.block}>
                    You have a duty to exercise reasonable care in safeguarding confidential information and preventing unauthorized access or disclosure. This includes implementing security measures such as password protection, encryption, and restricted access to sensitive data.
                </Text>

                <Text style={styles.subHeading}>Post-Employment Obligations:</Text>
                <Text style={styles.block}>
                    Your obligations regarding intellectual property ownership and confidentiality will continue even after the termination of your employment with INDUSINNOVATE. You are required to return all company property and refrain from disclosing or using confidential information following the conclusion of your employment.
                </Text>

                <Text style={styles.heading}>7. Compliance with Laws and Regulations</Text>
                <Text style={styles.block}>
                    As an employee of INDUSINNOVATE, you are expected to comply with all applicable laws, regulations, and company policies governing our business activities. This includes but is not limited to laws related to labor, health and safety, data privacy, and anti-discrimination.
                </Text>

                <Footer />
            </Page>

            {/* PAGE 3 */}
            <Page size="A4" style={styles.page} wrap>
                <PageBackground />
                <PageHeader />

                <Text style={styles.subHeading}>Integrity and Honesty</Text>
                <Text style={styles.block}>
                    You should conduct yourself with integrity and honesty in all interactions, both within the company and with external stake holders. You should not engage in deceptive, fraudulent, or unethical behavior, and you always strive to up hold the highest moral and ethical standards.
                </Text>

                <Text style={styles.subHeading}>Respect for Others</Text>
                <Text style={styles.block}>
                    You should treat all individuals with respect, dignity, and fairness, regardless of their position, background, or beliefs. Discrimination, harassment, and or any form of disrespectful behavior will not be tolerated in our workplace. We foster an inclusive environment where everyone feels valued and supported.
                </Text>

                <Text style={styles.subHeading}>Confidentiality and Privacy</Text>
                <Text style={styles.block}>
                    You should respect the confidentiality of company information and customer data entrusted to us. We do not disclose confidential or proprietary information without proper authorization, And we take appropriate measures to safe guard sensitive information from unauthorized access or disclosure.
                </Text>

                <Text style={styles.subHeading}>Conflict of Interest</Text>
                <Text style={styles.block}>
                    You should avoid situations that may create or appear to create a conflict of interest between your personal interests and the interests of the company. If you encounter a potential conflict of interest, you should disclose it promptly to your supervise or the appropriate authority and take necessary steps to resolve it in a transparent and ethical manner.
                </Text>

                <Text style={styles.subHeading}>Gifts, Entertainment, and Bribery</Text>
                <Text style={styles.block}>
                    We do not offer, solicit, or accept gifts, favors, or entertainment that may influence or be perceived to influence our business decisions. We also do not engage in bribery or corruption in any form, whether directly or indirectly, and we comply with all anti-corruption laws and regulations.
                </Text>

                <Text style={styles.subHeading}>Use of Company Resources</Text>
                <Text style={styles.block}>
                    You should use company resources, including equipment, facilities, and information technology systems, responsibly and for legitimate business purposes. You should not misuse or abuse company resources for personal gain or engage in unauthorized activities that may compromise the security or integrity of company systems.
                </Text>

                <Text style={styles.subHeading}>Environmental Responsibility</Text>
                <Text style={styles.block}>
                    We are committed to minimizing our environmental impact and promoting sustainability in our business operations. We comply with environmental laws and regulations, conserve natural resources, and strive to reduce waste and emissions in our activities.
                </Text>

                <Text style={styles.subHeading}>Reporting Violations</Text>
                <Text style={styles.block}>
                    We encourage employees to speak up if they become aware of any violations of this Code of Conduct or any unethical behavior within the company. Employees can report concerns or complaints to their supervisor, Human Resources, or through the company's anonymous
                </Text>

                <Footer />
            </Page>

            {/* PAGE 4 */}
            <Page size="A4" style={styles.page} wrap>
                <PageBackground />
                <PageHeader />

                <Text style={styles.block}>reporting channels, without fear of retaliation.</Text>

                <Text style={styles.block}>
                    As an employee of INDUSINNOVATE, you are expected to adhere to the company's code of conduct and policies at all times. Please familiarize yourself with our employee handbook, which outlines our expectations regarding professional conduct, ethics, and compliance.
                </Text>

                <Text style={styles.heading}>9. Termination</Text>

                <Text style={styles.subHeading}>At-Will Employment:</Text>
                <Text style={styles.block}>
                    Your employment with INDUSINNOVATE is at-will, which means that either you or the company may terminate the employment relationship at anytime, with or without cause, and with or without prior notice. This means that neither party is obligated to continue the employment relationship for any specific duration, nor both you and the company retain the right to terminate the employment arrangement at any time.
                </Text>

                <Text style={styles.subHeading}>Termination by Employee:</Text>
                <Text style={styles.block}>
                    If you choose to terminate your employment with INDUSINNOVATE, we ask that you provide 2 months notice in writing to your supervisor or the Human Resources department. This notice period allows us to make necessary arrangements to transition your responsibilities and minimize disruptions to our operations.
                </Text>

                <Text style={styles.subHeading}>Termination by Company:</Text>
                <Text style={styles.block}>
                    The company reserves the right to terminate your employment at any time, with or without cause, and with or without prior notice. Circumstances that may lead to termination include but are not limited to:
                </Text>
                <View style={styles.bulletRow}><Text style={styles.bulletDot}>•</Text><Text style={styles.bulletText}>Poor performance or failure to meet job expectations</Text></View>
                <View style={styles.bulletRow}><Text style={styles.bulletDot}>•</Text><Text style={styles.bulletText}>Violation of company policies, including the Code of Conduct and confidentiality agreements</Text></View>
                <View style={styles.bulletRow}><Text style={styles.bulletDot}>•</Text><Text style={styles.bulletText}>Breach of employment contract terms</Text></View>
                <View style={styles.bulletRow}><Text style={styles.bulletDot}>•</Text><Text style={styles.bulletText}>Misconduct or unethical behavior</Text></View>
                <View style={styles.bulletRow}><Text style={styles.bulletDot}>•</Text><Text style={styles.bulletText}>Reduction in work force or organization a restructuring</Text></View>
                <View style={styles.bulletRow}><Text style={styles.bulletDot}>•</Text><Text style={styles.bulletText}>Economic reasons or business necessity</Text></View>

                <Text style={styles.subHeading}>Return of Company Property:</Text>
                <Text style={styles.block}>
                    Up on termination of your employment, whether voluntary or involuntary, you are required to return all company property, including but not limited to:
                </Text>
                <View style={styles.bulletRow}><Text style={styles.bulletDot}>•</Text><Text style={styles.bulletText}>Laptops, computers, and mobile devices</Text></View>
                <View style={styles.bulletRow}><Text style={styles.bulletDot}>•</Text><Text style={styles.bulletText}>Access badges and keys</Text></View>
                <View style={styles.bulletRow}><Text style={styles.bulletDot}>•</Text><Text style={styles.bulletText}>Company-owned documents and materials</Text></View>
                <View style={styles.bulletRow}><Text style={styles.bulletDot}>•</Text><Text style={styles.bulletText}>Confidential information and proprietary data</Text></View>
                <Text style={styles.block}>
                    Failure to return company property may result in deductions from your final pay check or legal action to recover the missing items.
                </Text>

                <Footer />
            </Page>

            {/* PAGE 5 */}
            <Page size="A4" style={styles.page} wrap>
                <PageBackground />
                <PageHeader />

                <Text style={styles.subHeading}>Post-Termination Obligations:</Text>
                <Text style={styles.block}>
                    Following the termination of your employment, you are expected to adhere to any post-employment obligations, including but not limited to:
                </Text>
                <View style={styles.bulletRow}><Text style={styles.bulletDot}>•</Text><Text style={styles.bulletText}>Confidentiality obligations outlined in the Non-Disclosure Agreement (NDA)</Text></View>
                <View style={styles.bulletRow}><Text style={styles.bulletDot}>•</Text><Text style={styles.bulletText}>Non-compete agreements or restrictive covenants</Text></View>
                <View style={styles.bulletRow}><Text style={styles.bulletDot}>•</Text><Text style={styles.bulletText}>Cooperation in the transition of responsibilities and knowledge transfer, if applicable</Text></View>

                <Text style={styles.block}>
                    We are genuinely excited about the prospect of you joining our team and contributing to the success of INDUSINNOVATE. Your expertise and enthusiasm will undoubtedly be in valuable assets as we work together to achieve our goals.
                </Text>
                <Text style={styles.block}>
                    Once again, congratulations on your appointment, and we look forward to welcoming you to the INDUSINNOVATE family.
                </Text>
                <Text style={styles.block}>Sincerely,</Text>
                <Text style={styles.block}>A. Ramesh Reddy,</Text>
                <Text style={styles.block}>Sr. Manager</Text>
                <Text style={styles.block}>Indusinnovate Technologies Pvt. Ltd.</Text>

                <Footer />
            </Page>

            {/* PAGE 6 */}
            <Page size="A4" style={styles.page} wrap>
                <PageBackground />
                <PageHeader />

                <Text style={styles.heading}>Acknowledgment of Offer of Employment</Text>
                <Text style={styles.block}>
                    I, here by acknowledge receipt of the offer of employment from INDUSINNOVATE for the position of {positionTitle}, dated ________________.
                </Text>
                <Text style={styles.block}>
                    I would like to express my sincere gratitude for the opportunity to join the esteemed teammate INDUSINNOVATE. I have carefully reviewed the terms and conditions outlined in the offer letter, and Aim pleased to accept the position under the following terms:
                </Text>

                <Text style={styles.subHeading}>1. Position Details:</Text>
                <Text style={styles.block}>
                    I acknowledge my acceptance of the position of {positionTitle} with INDUSINNOVATE. I am excited to contribute my skills, experience, and dedication to the success of the team and the achievement of company goals.
                </Text>

                <Text style={styles.subHeading}>2. Start Date:</Text>
                <Text style={styles.block}>
                    I understand that my start date is scheduled for {joiningDate} as specified in the offer letter. I will ensure that Aim prepared to commence my duties promptly and will coordinate with the relevant departments to facilitate a smooth transition.
                </Text>

                <Text style={styles.subHeading}>3. Compensation and Benefits:</Text>
                <Text style={styles.block}>
                    I acknowledge and accept the compensation package offered by INDUSINNOVATE, including the salary, benefits, and any other incentives or allowances as detailed in the offer letter. I appreciate the company's commitment to providing competitive compensation and comprehensive benefits to its employees.
                </Text>

                <Text style={styles.subHeading}>4. Working Hours and Schedule:</Text>
                <Text style={styles.block}>
                    I understand the expected working hours and schedule out lined in the offer letter and will make every effort to adhere to them. I am committed to fulfilling my responsibilities and meeting the expectations of my role while maintaining a healthy work-life balance.
                </Text>

                <Text style={styles.subHeading}>5. Probationary Period:</Text>
                <Text style={styles.block}>
                    I acknowledge that my employment with INDUSINNOVATE will be subject to probationary periodof4 months, as stated in the offer letter. During this time, I will strive to demonstrate my capabilities and suitability for the position.
                </Text>

                <Text style={styles.subHeading}>6. Responsibilities:</Text>
                <Text style={styles.block}>
                    I understand the responsibilities associated with the position of {positionTitle}, as described in the offer letter and any additional discussions or documentation provided by INDUSINNOVATE. I am eager to contribute my expertise and skills to fulfill these responsibilities effectively.
                </Text>

                <Text style={styles.subHeading}>7. Confidentiality and Intellectual Property:</Text>
                <Text style={styles.block}>
                    I acknowledge my obligation to maintain the confidentiality of proprietary information and intellectual property belonging to INDUSINNOVATE and its clients. I understand the importance of safeguarding sensitive information and will adhere to the company's policies and procedures regarding confidentiality and intellectual property protection.
                </Text>

                <Footer />
            </Page>

            {/* PAGE 7 */}
            <Page size="A4" style={styles.page} wrap>
                <PageBackground />
                <PageHeader />

                <Text style={styles.subHeading}>8. Code of Conduct and Policies:</Text>
                <Text style={styles.block}>
                    I acknowledge my responsibility to comply with the company's code of conduct and policies, as out lined in the offer letter and a company in documentation. I understand that adherence to these policies is essential to maintaining a positive work environment and upholding the reputation and integrity of INDUSINNOVATE.
                </Text>

                <Text style={styles.subHeading}>9. Termination Clause:</Text>
                <Text style={styles.block}>
                    I acknowledge that my employment with INDUSINNOVATE is at-will, as stated in the offer letter. I understand that either party may terminate the employment relationship at any time, with or without cause, and with or without notice, subject to the terms and conditions outlined in the offer letter and applicable laws.
                </Text>

                <Text style={styles.subHeading}>10. Acknowledgment of Receipt:</Text>
                <Text style={styles.block}>
                    I acknowledge that I have received, read, and understood the offer letter and all accompanying documentation provided by INDUSINNOVATE. I confirm that I have had the opportunity to ask questions and seek clarification on any aspects of the offer or employment terms.
                </Text>

                <Text style={styles.subHeading}>11. Contact Information:</Text>
                <Text style={styles.block}>
                    I confirm that the contact information provided in the offer letter is accurate and up-to-date. I will promptly notify INDUSINNOVATE of any changes to my contact details to ensure effective communication.
                </Text>

                <Text style={styles.subHeading}>12. Gratitude:</Text>
                <Text style={styles.block}>
                    I would like to express my sincere Appreciation to INDUSINNOVATE and the entire recruitment team for considering me for this opportunity and for their professionalism throughout the hiring Process. I am eager to embark on this new journey with INDUSINNOVATE and look forward to making meaningful contributions to the organization.
                </Text>

                <Text style={styles.subHeading}>13. Acceptance:</Text>
                <Text style={styles.block}>
                    By signing below, I hereby accept the offer of employment from INDUSINNOVATE for the position of {positionTitle}, under the terms and conditions outlined in the offer letter and accompanying documentation.
                </Text>

                <Text style={styles.ackLine}>Signature: ____________________________</Text>
                <Text style={styles.ackLine}>Name: _______________________________</Text>
                <Text style={styles.ackLine}>Date: ____________________________________________</Text>

                <Footer />
            </Page>

            {/* PAGE 8 - ANNEXURE */}
            <Page size="A4" style={styles.page} wrap>
                <PageBackground />
                <PageHeader />

                <Text style={styles.heading}>Annexure-A</Text>
                <Text style={styles.block}>Your compensation break up Is as below:</Text>
                <Text style={styles.block}>Salary Annexure</Text>

                <View style={styles.table}>
                    <View style={styles.trHead}>
                        <Text style={styles.tdComponent}>Components</Text>
                        <Text style={styles.tdMonth}>Per Month (INR)</Text>
                        <Text style={styles.tdYear}>Per Annum (INR)</Text>
                    </View>
                    <View style={styles.tr}><Text style={styles.tdComponent}>Basic Pay</Text><Text style={styles.tdMonth}>{basicPayMonth.toLocaleString('en-IN')}</Text><Text style={styles.tdYear}>{(basicPayMonth * 12).toLocaleString('en-IN')}</Text></View>
                    <View style={styles.tr}><Text style={styles.tdComponent}>House Rent Allowance (HRA)</Text><Text style={styles.tdMonth}>{hraMonth.toLocaleString('en-IN')}</Text><Text style={styles.tdYear}>{(hraMonth * 12).toLocaleString('en-IN')}</Text></View>
                    <View style={styles.tr}><Text style={styles.tdComponent}>Conveyance Allowance</Text><Text style={styles.tdMonth}>{conveyanceMonth.toLocaleString('en-IN')}</Text><Text style={styles.tdYear}>{(conveyanceMonth * 12).toLocaleString('en-IN')}</Text></View>
                    <View style={styles.tr}><Text style={styles.tdComponent}>Special Allowance</Text><Text style={styles.tdMonth}>{specialAllowanceMonth.toLocaleString('en-IN')}</Text><Text style={styles.tdYear}>{(specialAllowanceMonth * 12).toLocaleString('en-IN')}</Text></View>
                    <View style={styles.tr}><Text style={styles.tdComponent}>Gross Salary (A)</Text><Text style={styles.tdMonth}>{grossMonth.toLocaleString('en-IN')}</Text><Text style={styles.tdYear}>{(grossMonth * 12).toLocaleString('en-IN')}</Text></View>
                    <View style={styles.tr}><Text style={styles.tdComponent}>Employee PF Contribution</Text><Text style={styles.tdMonth}>{employeePfMonth.toLocaleString('en-IN')}</Text><Text style={styles.tdYear}>{(employeePfMonth * 12).toLocaleString('en-IN')}</Text></View>
                    <View style={styles.tr}><Text style={styles.tdComponent}>Insurance (Company Paid)</Text><Text style={styles.tdMonth}>{insuranceMonth.toLocaleString('en-IN')}</Text><Text style={styles.tdYear}>{(insuranceMonth * 12).toLocaleString('en-IN')}</Text></View>
                    <View style={styles.tr}><Text style={styles.tdComponent}>Professional Tax</Text><Text style={styles.tdMonth}>{professionalTaxMonth.toLocaleString('en-IN')}</Text><Text style={styles.tdYear}>{(professionalTaxMonth * 12).toLocaleString('en-IN')}</Text></View>
                    <View style={styles.tr}>
                        <Text style={styles.tdComponent}>Total CTC (A + Benefits)</Text>
                        <Text style={styles.tdMonth}>{hasPaidCtc ? monthlyCtc.toLocaleString('en-IN') : 'Unpaid'}</Text>
                        <Text style={styles.tdYear}>{hasPaidCtc ? annualCtc.toLocaleString('en-IN') : 'Unpaid'}</Text>
                    </View>
                </View>

                <View style={styles.bulletRow}><Text style={styles.bulletDot}>•</Text><Text style={styles.bulletText}>Based on your Performance your variable pay will be given for every 6 months.</Text></View>
                <View style={styles.bulletRow}><Text style={styles.bulletDot}>•</Text><Text style={styles.bulletText}>Conveyance and Medical Allowance limits are set by law and will be adjusted in accordance with the maximums allowed by law from time to time.</Text></View>
                <View style={styles.bulletRow}><Text style={styles.bulletDot}>•</Text><Text style={styles.bulletText}>Appraisal cycle at INDUSINNOVATE is March every year.</Text></View>

                <Text style={[styles.block, { marginTop: 14 }]}>We welcome you to INDUSINNOVATE family. Come grow with us.</Text>

                <Footer />
            </Page>
        </Document>
    );
};

const OfferLetterPage = () => {
    const [history, setHistory] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showErrors, setShowErrors] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('');
    const [formData, setFormData] = useState({
        candidate_name: '',
        email: '',
        role: 'Software Developer - L1',
        position_title: 'Software Developer',
        department: 'IT',
        location: 'Hyderabad',
        issue_date: new Date().toISOString().slice(0, 10),
        ctc: '',
        joining_date: ''
    });

    useEffect(() => {
        fetchHistory();
    }, []);

    useEffect(() => {
        let isCancelled = false;

        const buildPreview = async () => {
            try {
                const blob = await pdf(<OfferLetterPDF data={formData} />).toBlob();
                if (isCancelled) return;

                const nextUrl = URL.createObjectURL(blob);
                setPreviewUrl((prevUrl) => {
                    if (prevUrl) URL.revokeObjectURL(prevUrl);
                    return nextUrl;
                });
            } catch (err) {
                // Keep current preview if PDF generation fails.
            }
        };

        buildPreview();

        return () => {
            isCancelled = true;
        };
    }, [formData]);

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    const fetchHistory = async () => {
        try {
            const data = await api.get('/offer-letters');
            setHistory(data);
        } catch (err) { }
    };

    const handleSave = async () => {
        const normalizedEmail = String(formData.email || '').trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (normalizedEmail && !emailRegex.test(normalizedEmail)) {
            toast.error('Please enter a valid candidate email address.');
            return;
        }
        
        if (!formData.ctc || Number(formData.ctc) <= 0) {
            setShowErrors(true);
            toast.error('CTC is required');
            return;
        }

        try {
            setLoading(true);
            const generatedBlob = await pdf(<OfferLetterPDF data={formData} />).toBlob();
            const payload = new FormData();
            payload.append('candidate_name', formData.candidate_name || '');
            payload.append('email', normalizedEmail);
            payload.append('role', formData.role || '');
            payload.append('department', formData.department || '');
            payload.append('ctc', formData.ctc || '');
            payload.append('joining_date', formData.joining_date || '');
            payload.append('offer_letter_pdf', generatedBlob, `offer_letter_${(formData.candidate_name || 'candidate').replace(/\s+/g, '_')}.pdf`);

            await api.post('/offer-letters', payload);
            fetchHistory();
            toast.success('Offer letter record created!');
        } catch (err) {
            toast.error(err?.message || 'Failed to save record');
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async (id) => {
        try {
            await api.post(`/offer-letters/${id}/send`, {});
            fetchHistory();
            toast.success('Offer letter sent successfully');
        } catch (err) {
            toast.error(err?.message || 'Failed to send offer letter');
        }
    };

    const handleBulkSend = async () => {
        if (selectedIds.length === 0) return;
        
        try {
            setLoading(true);
            const response = await api.post('/offer-letters/bulk-send', { ids: selectedIds });
            fetchHistory();
            setSelectedIds([]);
            toast.success(response.message || 'Bulk mail processing initiated');
        } catch (err) {
            toast.error(err?.message || 'Failed to process bulk mailings');
        } finally {
            setLoading(false);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === history.filter(h => h.email).length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(history.filter(h => h.email).map(h => h.id));
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    return (
        <div style={{ maxWidth: '1700px', margin: '0 auto', width: '100%' }}>
            <header className="no-print offer-header" style={{ marginBottom: '40px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', color: 'var(--text-main)', marginBottom: '4px' }}>Offer Letters</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Draft, preview, and transmit professional employment letters.</p>
                </div>
            </header>
            <div className="offer-layout" style={{ display: 'grid', gridTemplateColumns: '560px minmax(0, 1fr)', gap: '20px', alignItems: 'stretch' }}>
                {/* Left Column */}
                <div className="no-print" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="card" style={{ padding: '24px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FileText size={18} color="var(--primary)" /> Candidate Details
                        </h3>

                        <form style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748B', marginBottom: '8px' }}>CANDIDATE FULL NAME <span style={{ color: '#DC2626' }}>*</span></label>
                            <input
                                className="input-field"
                                placeholder="e.g. John Doe"
                                value={formData.candidate_name}
                                onChange={e => setFormData({ ...formData, candidate_name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748B', marginBottom: '8px' }}>CANDIDATE EMAIL <span style={{ color: '#DC2626' }}>*</span></label>
                            <input
                                className="input-field"
                                type="email"
                                placeholder="e.g. candidate@example.com"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748B', marginBottom: '8px' }}>POSITION ROLE <span style={{ color: '#DC2626' }}>*</span></label>
                                <input
                                    className="input-field"
                                    placeholder="e.g. Software Developer - L1"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748B', marginBottom: '8px' }}>POSITION TITLE <span style={{ color: '#DC2626' }}>*</span></label>
                                <input
                                    className="input-field"
                                    placeholder="e.g. Software Developer"
                                    value={formData.position_title}
                                    onChange={e => setFormData({ ...formData, position_title: e.target.value })}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748B', marginBottom: '8px' }}>DEPARTMENT <span style={{ color: '#DC2626' }}>*</span></label>
                                <select
                                    className="input-field"
                                    value={formData.department}
                                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                                >
                                    <option>IT</option>
                                    <option>Engineering</option>
                                    <option>Design</option>
                                    <option>Marketing</option>
                                    <option>HR</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748B', marginBottom: '8px' }}>LOCATION <span style={{ color: '#DC2626' }}>*</span></label>
                                <input
                                    className="input-field"
                                    placeholder="e.g. Hyderabad"
                                    value={formData.location}
                                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748B', marginBottom: '8px' }}>LETTER DATE <span style={{ color: '#DC2626' }}>*</span></label>
                                <input
                                    className="input-field"
                                    type="date"
                                    value={formData.issue_date}
                                    onChange={e => setFormData({ ...formData, issue_date: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: (showErrors && !formData.ctc) ? '#DC2626' : '#64748B', marginBottom: '8px' }}>
                                    TOTAL CTC (INR) <span style={{ color: '#DC2626' }}>*</span>
                                </label>
                                <input
                                    className="input-field"
                                    type="number"
                                    placeholder="e.g. 1200000"
                                    value={formData.ctc}
                                    onChange={e => {
                                        setFormData({ ...formData, ctc: e.target.value });
                                        if (e.target.value) setShowErrors(false);
                                    }}
                                    style={showErrors && (!formData.ctc || Number(formData.ctc) <= 0) ? { border: '1px solid #DC2626', background: '#FEF2F2' } : {}}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748B', marginBottom: '8px' }}>JOINING DATE <span style={{ color: '#DC2626' }}>*</span></label>
                                <input
                                    className="input-field"
                                    type="date"
                                    value={formData.joining_date}
                                    onChange={e => setFormData({ ...formData, joining_date: e.target.value })}
                                />
                            </div>
                        </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={loading}
                                    style={{
                                        flex: 1, padding: '14px', background: 'var(--primary)', color: 'white',
                                        border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                    }}
                                >
                                    <Plus size={18} /> {loading ? 'Saving...' : 'Generate Offer'}
                                </button>
                                <PDFDownloadLink
                                    document={<OfferLetterPDF data={formData} />}
                                    fileName={`offer_letter_${(formData.candidate_name || 'candidate').replace(/\s+/g, '_')}.pdf`}
                                    style={{ flex: 1, textDecoration: 'none' }}
                                >
                                    {({ loading: pdfLoading }) => (
                                        <button
                                            type="button"
                                            disabled={pdfLoading}
                                            style={{
                                                width: '100%', padding: '14px', background: 'var(--card-bg)', color: 'var(--primary)',
                                                border: '1.5px solid var(--primary)', borderRadius: '12px', fontWeight: '700', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                            }}
                                        >
                                            <Download size={18} /> {pdfLoading ? 'Preparing...' : 'Download PDF'}
                                        </button>
                                    )}
                                </PDFDownloadLink>
                            </div>
                        </form>
                    </div>

                </div>

                {/* Preview Column */}
                <div className="card preview-column" style={{ padding: '0', overflow: 'hidden', height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '16px 24px', background: '#F8FAFC', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748B' }}>LIVE PREVIEW (8-PAGE DYNAMIC OFFER LETTER)</span>
                        <Printer size={16} color="#64748B" />
                    </div>
                    <div style={{ flex: 1, width: '100%', minHeight: 0, background: '#FFFFFF' }}>
                        {previewUrl ? (
                            <iframe
                                title="Offer Letter Preview"
                                src={`${previewUrl}#toolbar=0&navpanes=0&statusbar=0&view=FitH`}
                                style={{ border: 'none', width: '100%', height: '100%', background: '#FFFFFF' }}
                            />
                        ) : (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: '14px' }}>
                                Preparing preview...
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* History List */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                        <History size={18} color="var(--primary)" /> Generation History
                    </h3>
                    {selectedIds.length > 0 && (
                        <button
                            onClick={handleBulkSend}
                            disabled={loading}
                            style={{
                                padding: '8px 16px', background: 'var(--primary)', color: 'white',
                                border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px'
                            }}
                        >
                            <Mail size={16} /> Send Bulk Email ({selectedIds.length})
                        </button>
                    )}
                </div>
                <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#F8FAFC', borderBottom: '1px solid var(--border)' }}>
                            <tr>
                                <th style={{ width: '48px', padding: '16px' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={history.length > 0 && selectedIds.length === history.filter(h => h.email).length}
                                        onChange={toggleSelectAll}
                                        style={{ cursor: 'pointer' }}
                                    />
                                </th>
                                <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '700', color: '#64748B' }}>CANDIDATE</th>
                                <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '700', color: '#64748B' }}>EMAIL</th>
                                <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '700', color: '#64748B' }}>ROLE</th>
                                <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '700', color: '#64748B' }}>JOINING</th>
                                <th style={{ textAlign: 'left', padding: '16px', fontSize: '12px', fontWeight: '700', color: '#64748B' }}>STATUS</th>
                                <th style={{ textAlign: 'right', padding: '16px', fontSize: '12px', fontWeight: '700', color: '#64748B' }}>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map((h, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #F1F5F9', background: selectedIds.includes(h.id) ? '#F8FAFC' : 'transparent' }}>
                                    <td style={{ padding: '16px' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedIds.includes(h.id)}
                                            onChange={() => toggleSelect(h.id)}
                                            disabled={!h.email}
                                            style={{ cursor: h.email ? 'pointer' : 'not-allowed' }}
                                        />
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '14px', fontWeight: '600' }}>{h.candidate_name}</td>
                                    <td style={{ padding: '16px', fontSize: '13px', color: h.email ? 'var(--text-main)' : '#DC2626', fontWeight: h.email ? 500 : 700 }}>
                                        {h.email || 'Email missing'}
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '14px' }}>{h.role}</td>
                                    <td style={{ padding: '16px', fontSize: '14px', color: '#64748B' }}>{new Date(h.joining_date).toLocaleDateString()}</td>
                                    <td style={{ padding: '16px' }}>
                                        <span className={`status-badge ${h.status.toLowerCase()}`}>
                                            {h.status}
                                        </span>
                                        {!h.email && (
                                            <div style={{ marginTop: '6px', fontSize: '11px', color: '#DC2626', fontWeight: 700 }}>Cannot send until email is added</div>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'right' }}>
                                        <button
                                            disabled={!h.email}
                                            onClick={() => handleSend(h.id)}
                                            style={{ border: 'none', background: 'none', cursor: h.email ? 'pointer' : 'not-allowed', color: h.email ? 'var(--primary)' : '#94A3B8', padding: '4px' }}
                                            title={h.email ? 'Send Email' : 'Candidate email missing'}
                                        >
                                            <Mail size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

            <style>{`
                @media (max-width: 1200px) {
                    .offer-layout { grid-template-columns: 1fr !important; }
                    .preview-column { height: 75vh !important; min-height: 600px !important; }
                }

                @media print {
                    .card { border: none !important; box-shadow: none !important; }
                    h1, p, header { display: none !important; }
                    .main-content { padding: 0 !important; }
                }
            `}</style>
        </div>
    );
};

export default OfferLetterPage;
