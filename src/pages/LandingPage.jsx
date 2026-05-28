import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
    LogIn, MessageSquare, HardDrive, Video, Bell, Clock3, Wallet,
    BarChart3, Users, UserCheck, ClipboardList, CreditCard, Calendar,
    Shield, Zap, Globe, ArrowRight, Mail, ChevronDown, Briefcase,
    Award, Target, TrendingUp, Sparkles, Layers, AlertTriangle,
    Activity, CheckCircle2, XCircle, Database,
} from 'lucide-react';
import './LandingPage.css';

gsap.registerPlugin(ScrollTrigger);

// ─── Hero Visual: Auto-cycling HR Illustrations ───────────────────
const HeroVisual = () => {
    const [activeSlide, setActiveSlide] = useState(0);

    const slides = [
        { src: '/illustrations/undraw_good-team_zww8.svg', label: 'Team Collaboration' },
        { src: '/illustrations/undraw_data_25jw.svg', label: 'Employee Data' },
        { src: '/illustrations/undraw_stepping-up_i0i7.svg', label: 'Performance Growth' },
        { src: '/illustrations/undraw_email_b5yu.svg', label: 'Offer Letters' },
        { src: '/illustrations/undraw_engineering-team_13ax.svg', label: 'Engineering Team' },
        { src: '/illustrations/undraw_device-sync_d9ei.svg', label: 'Multi-device Access' },
        { src: '/illustrations/undraw_team-assignment_lzot.svg', label: 'Task Assignment' },
        { src: '/illustrations/undraw_anonymous-feedback_gug3.svg', label: 'Feedback & Reviews' },
        { src: '/illustrations/undraw_design-tools_wgpz.svg', label: 'Design Tools' },
        { src: '/illustrations/undraw_phone-call_ov3z.svg', label: 'Communication' },
        { src: '/illustrations/undraw_text-messages_p6bk.svg', label: 'Messaging' },
        { src: '/illustrations/undraw_enter-password_1kl4.svg', label: 'Secure Access' },
    ];

    useEffect(() => {
        const timer = setInterval(() => setActiveSlide(s => (s + 1) % slides.length), 1200);
        return () => clearInterval(timer);
    }, [slides.length]);

    return (
        <div className="hv">
            <div className="hv-carousel">
                {slides.map((slide, i) => (
                    <div key={i} className={`hv-item ${activeSlide === i ? 'active' : ''}`}>
                        <img src={slide.src} alt={slide.label} />
                    </div>
                ))}
            </div>
            <div className="hv-label">{slides[activeSlide].label}</div>
            <div className="hv-dots">
                {slides.map((_, i) => (
                    <button key={i} className={`hv-dot ${activeSlide === i ? 'active' : ''}`} onClick={() => setActiveSlide(i)} />
                ))}
            </div>
        </div>
    );
};

// ─── SVG Scene: Recruitment (person interviewing) ─────────────────
const RecruitmentScene = () => (
    <svg viewBox="0 0 400 280" className="hv-svg" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="bgRec" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="floor1" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#020617" />
            </linearGradient>
        </defs>
        <rect width="400" height="280" fill="url(#bgRec)" rx="12" />

        {/* Floor */}
        <rect x="0" y="220" width="400" height="60" fill="url(#floor1)" />

        {/* Plant decoration */}
        <g className="float-slow">
            <rect x="20" y="180" width="30" height="40" fill="#475569" rx="2" />
            <circle cx="35" cy="170" r="20" fill="#10b981" />
            <circle cx="25" cy="160" r="14" fill="#10b981" />
            <circle cx="45" cy="160" r="14" fill="#10b981" />
        </g>

        {/* Desk */}
        <rect x="60" y="190" width="280" height="8" fill="#3b82f6" rx="2" />
        <rect x="80" y="198" width="6" height="22" fill="#475569" />
        <rect x="314" y="198" width="6" height="22" fill="#475569" />

        {/* Interviewer (person 1, left) */}
        <g className="float-slow">
            {/* Hair */}
            <ellipse cx="120" cy="105" rx="25" ry="22" fill="#1e293b" />
            {/* Face */}
            <circle cx="120" cy="115" r="20" fill="#fcd5b4" />
            {/* Body/Suit */}
            <path d="M 95 145 Q 120 135 145 145 L 150 195 L 90 195 Z" fill="#1e40af" />
            {/* Tie */}
            <path d="M 117 145 L 123 145 L 121 175 L 119 175 Z" fill="#fb923c" />
            {/* Arm */}
            <ellipse cx="100" cy="170" rx="10" ry="20" fill="#1e40af" transform="rotate(-15 100 170)" />
        </g>

        {/* Candidate being interviewed (person 2, right with paper) */}
        <g className="float-slow" style={{ animationDelay: '1s' }}>
            <ellipse cx="280" cy="105" rx="22" ry="20" fill="#7c2d12" />
            <circle cx="280" cy="115" r="20" fill="#fcd5b4" />
            <path d="M 255 145 Q 280 135 305 145 L 308 195 L 252 195 Z" fill="#a78bfa" />
            {/* Paper/CV */}
            <rect x="265" y="155" width="30" height="35" fill="#fff" rx="2" />
            <line x1="270" y1="162" x2="290" y2="162" stroke="#94a3b8" strokeWidth="1" />
            <line x1="270" y1="168" x2="290" y2="168" stroke="#94a3b8" strokeWidth="1" />
            <line x1="270" y1="174" x2="285" y2="174" stroke="#94a3b8" strokeWidth="1" />
        </g>

        {/* Floating UI: Resume cards */}
        <g className="float-fast">
            <rect x="170" y="40" width="80" height="50" fill="#1e293b" stroke="#3b82f6" strokeWidth="1.5" rx="6" />
            <circle cx="185" cy="60" r="8" fill="#fb923c" />
            <line x1="200" y1="55" x2="240" y2="55" stroke="#cbd5e1" strokeWidth="2" />
            <line x1="200" y1="63" x2="230" y2="63" stroke="#64748b" strokeWidth="1.5" />
            <rect x="200" y="72" width="35" height="10" fill="#10b981" rx="2" />
            <text x="218" y="80" fontSize="6" fill="#fff" textAnchor="middle" fontWeight="700">SELECTED</text>
        </g>

        {/* Search icon floating */}
        <g className="float-fast" style={{ animationDelay: '0.5s' }}>
            <circle cx="60" cy="60" r="22" fill="#3b82f6" />
            <circle cx="60" cy="60" r="9" fill="none" stroke="#fff" strokeWidth="2.5" />
            <line x1="66" y1="66" x2="72" y2="72" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
        </g>

        {/* Star ratings floating */}
        <g className="float-fast" style={{ animationDelay: '1.5s' }}>
            {[0, 1, 2, 3, 4].map((i) => (
                <text key={i} x={320 + i * 12} y="55" fontSize="14" fill="#fbbf24">★</text>
            ))}
        </g>
    </svg>
);

// ─── SVG Scene: Employee Information ──────────────────────────────
const EmployeeInfoScene = () => (
    <svg viewBox="0 0 400 280" className="hv-svg">
        <defs>
            <linearGradient id="bgEmp" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
        </defs>
        <rect width="400" height="280" fill="url(#bgEmp)" rx="12" />

        {/* Person at desk with laptop (center) */}
        <g className="float-slow">
            {/* Hair */}
            <path d="M 175 75 Q 200 55 225 75 L 220 100 L 180 100 Z" fill="#7c2d12" />
            {/* Face */}
            <circle cx="200" cy="100" r="22" fill="#fcd5b4" />
            {/* Body */}
            <path d="M 170 135 Q 200 125 230 135 L 235 195 L 165 195 Z" fill="#a78bfa" />
            {/* Arms reaching to laptop */}
            <ellipse cx="170" cy="170" rx="10" ry="22" fill="#a78bfa" transform="rotate(20 170 170)" />
            <ellipse cx="230" cy="170" rx="10" ry="22" fill="#a78bfa" transform="rotate(-20 230 170)" />
        </g>

        {/* Laptop */}
        <g>
            <rect x="155" y="180" width="90" height="55" fill="#1e293b" stroke="#475569" strokeWidth="1.5" rx="4" />
            <rect x="160" y="185" width="80" height="42" fill="#0f172a" rx="2" />
            {/* Screen content */}
            <circle cx="180" cy="200" r="6" fill="#3b82f6" />
            <line x1="190" y1="198" x2="225" y2="198" stroke="#cbd5e1" strokeWidth="1.5" />
            <line x1="190" y1="204" x2="220" y2="204" stroke="#64748b" strokeWidth="1" />
            <line x1="165" y1="215" x2="235" y2="215" stroke="#475569" strokeWidth="0.5" />
            <line x1="165" y1="220" x2="200" y2="220" stroke="#475569" strokeWidth="0.5" />
            {/* Laptop base */}
            <rect x="150" y="234" width="100" height="6" fill="#475569" rx="2" />
        </g>

        {/* Floating ID card (left) */}
        <g className="float-fast">
            <rect x="30" y="60" width="90" height="120" fill="#1e293b" stroke="#3b82f6" strokeWidth="1.5" rx="8" />
            <rect x="30" y="60" width="90" height="20" fill="#3b82f6" rx="8" />
            <text x="75" y="74" fontSize="8" fill="#fff" textAnchor="middle" fontWeight="700">EMPLOYEE ID</text>
            <circle cx="75" cy="105" r="18" fill="#fb923c" />
            <text x="75" y="110" fontSize="14" fill="#fff" textAnchor="middle" fontWeight="700">EJ</text>
            <line x1="40" y1="135" x2="110" y2="135" stroke="#475569" strokeWidth="1" />
            <line x1="40" y1="145" x2="100" y2="145" stroke="#64748b" strokeWidth="0.8" />
            <line x1="40" y1="153" x2="105" y2="153" stroke="#64748b" strokeWidth="0.8" />
            <line x1="40" y1="161" x2="90" y2="161" stroke="#64748b" strokeWidth="0.8" />
            <rect x="40" y="168" width="50" height="6" fill="#10b981" rx="2" />
        </g>

        {/* Profile data card (right) */}
        <g className="float-fast" style={{ animationDelay: '1s' }}>
            <rect x="280" y="50" width="100" height="140" fill="#1e293b" stroke="#a78bfa" strokeWidth="1.5" rx="8" />
            <circle cx="330" cy="80" r="16" fill="#a78bfa" />
            <text x="330" y="85" fontSize="11" fill="#fff" textAnchor="middle" fontWeight="700">EJ</text>
            <line x1="290" y1="110" x2="370" y2="110" stroke="#475569" strokeWidth="1" />
            {[0, 1, 2, 3].map((i) => (
                <g key={i}>
                    <rect x="290" y={120 + i * 14} width="30" height="3" fill="#64748b" rx="1.5" />
                    <rect x="324" y={120 + i * 14} width="46" height="3" fill="#cbd5e1" rx="1.5" />
                </g>
            ))}
        </g>
    </svg>
);

// ─── SVG Scene: Attendance ────────────────────────────────────────
const AttendanceScene = () => (
    <svg viewBox="0 0 400 280" className="hv-svg">
        <defs>
            <linearGradient id="bgAtt" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
        </defs>
        <rect width="400" height="280" fill="url(#bgAtt)" rx="12" />

        {/* Person holding phone */}
        <g className="float-slow">
            <ellipse cx="120" cy="80" rx="22" ry="20" fill="#1e293b" />
            <circle cx="120" cy="90" r="20" fill="#fcd5b4" />
            <path d="M 95 120 Q 120 110 145 120 L 150 200 L 90 200 Z" fill="#3b82f6" />
            {/* Arms holding phone */}
            <ellipse cx="100" cy="155" rx="10" ry="22" fill="#3b82f6" transform="rotate(-25 100 155)" />
            <ellipse cx="140" cy="155" rx="10" ry="22" fill="#3b82f6" transform="rotate(25 140 155)" />
            {/* Phone */}
            <rect x="105" y="135" width="30" height="50" fill="#1e293b" stroke="#10b981" strokeWidth="2" rx="4" />
            <rect x="108" y="140" width="24" height="35" fill="#0f172a" rx="2" />
            <circle cx="120" cy="150" r="3" fill="#10b981" />
            <line x1="112" y1="158" x2="128" y2="158" stroke="#cbd5e1" strokeWidth="1" />
            <line x1="112" y1="164" x2="125" y2="164" stroke="#64748b" strokeWidth="0.8" />
        </g>

        {/* Calendar card */}
        <g className="float-fast">
            <rect x="200" y="40" width="170" height="160" fill="#1e293b" stroke="#10b981" strokeWidth="1.5" rx="8" />
            <rect x="200" y="40" width="170" height="28" fill="#10b981" rx="8" />
            <text x="285" y="59" fontSize="11" fill="#fff" textAnchor="middle" fontWeight="700">ATTENDANCE OVERVIEW</text>
            {/* Days */}
            {['M', 'T', 'W', 'T', 'F'].map((d, i) => (
                <g key={i}>
                    <text x={220 + i * 30} y="85" fontSize="9" fill="#94a3b8" textAnchor="middle" fontWeight="700">{d}</text>
                    <text x={220 + i * 30} y="105" fontSize="13" fill="#fff" textAnchor="middle" fontWeight="700">{20 + i}</text>
                </g>
            ))}
            {/* Highlight today (Wed) */}
            <circle cx="280" cy="100" r="14" fill="#10b981" opacity="0.3" />
            {/* Stats */}
            <rect x="215" y="125" width="140" height="20" fill="#0f172a" rx="4" />
            <text x="222" y="138" fontSize="9" fill="#94a3b8">Check In</text>
            <text x="290" y="138" fontSize="9" fill="#10b981" fontWeight="700">09:02 AM ✓</text>
            <rect x="215" y="150" width="140" height="20" fill="#0f172a" rx="4" />
            <text x="222" y="163" fontSize="9" fill="#94a3b8">Check Out</text>
            <text x="290" y="163" fontSize="9" fill="#10b981" fontWeight="700">06:15 PM ✓</text>
            <rect x="215" y="175" width="140" height="20" fill="#10b981" opacity="0.2" rx="4" />
            <text x="222" y="188" fontSize="9" fill="#94a3b8">Total Hours</text>
            <text x="350" y="188" fontSize="10" fill="#10b981" textAnchor="end" fontWeight="800">09h 13m</text>
        </g>

        {/* Clock icon floating */}
        <g className="float-fast" style={{ animationDelay: '0.7s' }}>
            <circle cx="55" cy="220" r="20" fill="#fb923c" />
            <circle cx="55" cy="220" r="14" fill="none" stroke="#fff" strokeWidth="2" />
            <line x1="55" y1="220" x2="55" y2="212" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            <line x1="55" y1="220" x2="62" y2="220" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        </g>
    </svg>
);

// ─── SVG Scene: Payroll ───────────────────────────────────────────
const PayrollScene = () => (
    <svg viewBox="0 0 400 280" className="hv-svg">
        <defs>
            <linearGradient id="bgPay" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
        </defs>
        <rect width="400" height="280" fill="url(#bgPay)" rx="12" />

        {/* Person celebrating */}
        <g className="float-slow">
            <ellipse cx="80" cy="90" rx="22" ry="20" fill="#7c2d12" />
            <circle cx="80" cy="100" r="20" fill="#fcd5b4" />
            {/* Smile */}
            <path d="M 72 105 Q 80 112 88 105" stroke="#7c2d12" strokeWidth="1.5" fill="none" />
            {/* Body */}
            <path d="M 55 130 Q 80 120 105 130 L 110 200 L 50 200 Z" fill="#fb923c" />
            {/* Raised arms */}
            <ellipse cx="50" cy="130" rx="10" ry="25" fill="#fb923c" transform="rotate(-30 50 130)" />
            <ellipse cx="110" cy="130" rx="10" ry="25" fill="#fb923c" transform="rotate(30 110 130)" />
        </g>

        {/* Payslip card */}
        <g className="float-fast">
            <rect x="170" y="40" width="200" height="200" fill="#1e293b" stroke="#fb923c" strokeWidth="1.5" rx="10" />
            <rect x="170" y="40" width="200" height="32" fill="#fb923c" rx="10" />
            <text x="270" y="61" fontSize="13" fill="#fff" textAnchor="middle" fontWeight="800">PAYSLIP — MAY 2024</text>

            {/* Lines */}
            {[
                { l: 'Basic Salary', v: '₹50,000', y: 90, c: '#fff' },
                { l: 'Allowances', v: '₹10,000', y: 115, c: '#10b981' },
                { l: 'Deductions', v: '₹5,000', y: 140, c: '#ef4444' },
            ].map((row, i) => (
                <g key={i}>
                    <text x="185" y={row.y} fontSize="11" fill="#94a3b8">{row.l}</text>
                    <text x="355" y={row.y} fontSize="12" fill={row.c} textAnchor="end" fontWeight="700">{row.v}</text>
                    <line x1="185" y1={row.y + 8} x2="355" y2={row.y + 8} stroke="#334155" strokeWidth="0.5" strokeDasharray="2 2" />
                </g>
            ))}

            {/* Net salary */}
            <rect x="180" y="160" width="180" height="36" fill="#10b981" opacity="0.15" rx="6" />
            <text x="190" y="183" fontSize="12" fill="#10b981" fontWeight="700">NET SALARY</text>
            <text x="350" y="183" fontSize="16" fill="#10b981" textAnchor="end" fontWeight="800">₹55,000</text>

            {/* Paid badge */}
            <rect x="280" y="208" width="80" height="22" fill="#10b981" rx="11" />
            <text x="320" y="223" fontSize="11" fill="#fff" textAnchor="middle" fontWeight="800">✓ PAID</text>
        </g>

        {/* Coins floating */}
        <g className="float-fast" style={{ animationDelay: '0.5s' }}>
            <circle cx="40" cy="240" r="14" fill="#fbbf24" stroke="#f59e0b" strokeWidth="2" />
            <text x="40" y="245" fontSize="14" fill="#92400e" textAnchor="middle" fontWeight="800">$</text>
        </g>
        <g className="float-fast" style={{ animationDelay: '1.2s' }}>
            <circle cx="135" cy="245" r="11" fill="#fbbf24" stroke="#f59e0b" strokeWidth="2" />
            <text x="135" y="250" fontSize="12" fill="#92400e" textAnchor="middle" fontWeight="800">₹</text>
        </g>
    </svg>
);

// ─── SVG Scene: Performance ───────────────────────────────────────
const PerformanceScene = () => (
    <svg viewBox="0 0 400 280" className="hv-svg">
        <defs>
            <linearGradient id="bgPerf" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
        </defs>
        <rect width="400" height="280" fill="url(#bgPerf)" rx="12" />

        {/* Person presenting */}
        <g className="float-slow">
            <ellipse cx="320" cy="80" rx="22" ry="20" fill="#1e293b" />
            <circle cx="320" cy="90" r="20" fill="#fcd5b4" />
            <path d="M 295 120 Q 320 110 345 120 L 350 200 L 290 200 Z" fill="#a78bfa" />
            {/* Pointing arm */}
            <ellipse cx="280" cy="155" rx="10" ry="28" fill="#a78bfa" transform="rotate(-45 280 155)" />
            {/* Pointing finger position - already at end of arm */}
        </g>

        {/* Performance dashboard */}
        <g className="float-fast">
            <rect x="30" y="40" width="230" height="200" fill="#1e293b" stroke="#a78bfa" strokeWidth="1.5" rx="10" />
            <text x="50" y="65" fontSize="12" fill="#fff" fontWeight="800">PERFORMANCE SCORE</text>

            {/* Big circle score */}
            <circle cx="100" cy="130" r="40" fill="none" stroke="#334155" strokeWidth="6" />
            <circle cx="100" cy="130" r="40" fill="none" stroke="#a78bfa" strokeWidth="6"
                strokeDasharray="226"
                strokeDashoffset="45"
                strokeLinecap="round"
                transform="rotate(-90 100 130)" />
            <text x="100" y="128" fontSize="28" fill="#fff" textAnchor="middle" fontWeight="800">4.5</text>
            <text x="100" y="148" fontSize="10" fill="#94a3b8" textAnchor="middle">/ 5.0</text>

            {/* Goals checklist */}
            <text x="160" y="100" fontSize="10" fill="#94a3b8" fontWeight="700">GOALS</text>
            {[
                { l: 'Project Delivery', y: 120 },
                { l: 'Team Collab', y: 145 },
                { l: 'Innovation', y: 170 },
            ].map((g, i) => (
                <g key={i}>
                    <rect x="160" y={g.y - 10} width="80" height="20" fill="#0f172a" stroke="#334155" strokeWidth="0.5" rx="4" />
                    <circle cx="170" cy={g.y} r="5" fill="#10b981" />
                    <path d={`M ${167} ${g.y} L ${169} ${g.y + 2} L ${173} ${g.y - 2}`} stroke="#fff" strokeWidth="1.5" fill="none" />
                    <text x="180" y={g.y + 3} fontSize="9" fill="#cbd5e1" fontWeight="600">{g.l}</text>
                </g>
            ))}

            {/* Trend bars */}
            <rect x="50" y="195" width="190" height="32" fill="#0f172a" rx="6" />
            {[20, 35, 28, 45, 38, 55, 48, 62, 70].map((h, i) => (
                <rect key={i} x={60 + i * 20} y={225 - h * 0.5} width="10" height={h * 0.5} fill="url(#barGrad)" rx="2" />
            ))}
            <linearGradient id="barGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
        </g>

        {/* Trophy floating */}
        <g className="float-fast" style={{ animationDelay: '0.8s' }}>
            <path d="M 280 50 L 280 70 Q 280 80 290 80 L 290 90 L 310 90 L 310 80 Q 320 80 320 70 L 320 50 Z" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1.5" />
            <rect x="293" y="92" width="14" height="6" fill="#92400e" />
            <text x="300" y="73" fontSize="14" fill="#fff" textAnchor="middle" fontWeight="800">★</text>
        </g>
    </svg>
);

// ─── Problem Visual ────────────────────────────────────────────────
const ProblemVisual = () => (
    <div className="pv">
        {[
            { name: 'Spreadsheet.xlsx', x: 5, y: 10, r: -8 },
            { name: 'OldPayroll.app', x: 55, y: 5, r: 5 },
            { name: 'Notes.txt', x: 10, y: 48, r: 3 },
            { name: 'Email Thread', x: 50, y: 42, r: -6 },
            { name: 'PDF Report.pdf', x: 5, y: 78, r: 10 },
            { name: 'Other Tool', x: 55, y: 72, r: -4 },
        ].map((t, i) => (
            <div key={i} className="pv-card" data-anim="scatter" style={{ left: `${t.x}%`, top: `${t.y}%`, '--r': `${t.r}deg` }}>
                <div className="pv-header"><div className="pv-dots"><span /><span /><span /></div><span>{t.name}</span></div>
                <div className="pv-body"><div className="pv-line" style={{ width: '80%' }} /><div className="pv-line" style={{ width: '60%' }} /><div className="pv-line pv-err" style={{ width: '40%' }} /></div>
                <div className="pv-error"><XCircle size={12} /><span>Out of sync</span></div>
            </div>
        ))}
    </div>
);

// ─── Solution Visual ───────────────────────────────────────────────
const SolutionVisual = () => (
    <div className="sv">
        <div className="sv-dash" data-anim="dashboard">
            <div className="sv-top"><div className="sv-logo"><img src="/login.png" alt="" /></div><div className="sv-search">⌘K Search...</div><div className="sv-av">SK</div></div>
            <div className="sv-body">
                <div className="sv-side">{[Users, UserCheck, ClipboardList, CreditCard, BarChart3, Calendar, Award].map((I, i) => <div key={i} className={`sv-si ${i === 0 ? 'on' : ''}`}><I size={14} /></div>)}</div>
                <div className="sv-main">
                    <div className="sv-row">{[{ l: 'Employees', v: '1,247', t: '↑12%' }, { l: 'Active', v: '1,189', t: '↑5%' }, { l: 'Tickets', v: '23', t: '↓8%' }].map((s, i) => <div key={i} className="sv-stat"><span className="sv-sl">{s.l}</span><span className="sv-sv">{s.v}</span><span className={`sv-st ${s.t.startsWith('↑') ? 'up' : 'dn'}`}>{s.t}</span></div>)}</div>
                    <div className="sv-chart"><div className="sv-ch">Workforce Activity<span className="sv-live">● LIVE</span></div><div className="sv-bars">{[40, 65, 45, 80, 55, 70, 90, 60, 75, 85, 50, 95].map((h, i) => <div key={i} className="sv-bar" style={{ '--h': `${h}%`, '--d': `${i * 0.05}s` }} />)}</div></div>
                </div>
            </div>
        </div>
        <div className="sv-notif" data-anim="float"><CheckCircle2 size={14} /><div><strong>Payroll synced</strong><span>1,247 records · 0 errors</span></div></div>
        <div className="sv-badge" data-anim="float"><Activity size={12} /><span>REAL-TIME SYNC</span></div>
    </div>
);

// ─── Modules Visual: Orbital System ───────────────────────────────
const ModulesVisual = () => {
    const mods = [
        { icon: MessageSquare, label: 'Chat', color: '#3b82f6' },
        { icon: HardDrive, label: 'Drive', color: '#06b6d4' },
        { icon: Video, label: 'Meetings', color: '#8b5cf6' },
        { icon: Bell, label: 'Notify', color: '#f59e0b' },
        { icon: Clock3, label: 'Shifts', color: '#10b981' },
        { icon: Wallet, label: 'Expense', color: '#ec4899' },
        { icon: BarChart3, label: 'Analytics', color: '#fb923c' },
        { icon: UserCheck, label: 'Attendance', color: '#a78bfa' },
        { icon: CreditCard, label: 'Payroll', color: '#22c55e' },
        { icon: Calendar, label: 'Calendar', color: '#06b6d4' },
        { icon: Shield, label: 'Compliance', color: '#ef4444' },
        { icon: Award, label: 'Performance', color: '#f472b6' },
    ];

    return (
        <div className="mv">
            <div className="mv-orbit">
                {/* Orbital rings */}
                <div className="mv-ring mv-ring-1" />
                <div className="mv-ring mv-ring-2" />
                <div className="mv-ring mv-ring-3" />

                {/* Central hub */}
                <div className="mv-hub">
                    <div className="mv-hub-glow" />
                    <div className="mv-hub-core">
                        <Layers size={28} />
                        <span>ALL-IN-ONE</span>
                    </div>
                </div>

                {/* Orbiting modules */}
                {mods.map((m, i) => {
                    const ring = i < 4 ? 1 : i < 8 ? 2 : 3;
                    const angleOffset = (i % 4) * 90;
                    return (
                        <div
                            key={i}
                            className={`mv-node mv-node-ring-${ring}`}
                            style={{
                                '--color': m.color,
                                '--angle': `${angleOffset}deg`,
                                '--speed': `${18 + ring * 6}s`,
                                '--dir': ring % 2 === 0 ? 'reverse' : 'normal',
                            }}
                        >
                            <div className="mv-node-inner">
                                <m.icon size={16} />
                            </div>
                            <span className="mv-node-label">{m.label}</span>
                        </div>
                    );
                })}

                {/* Pulse waves */}
                <div className="mv-pulse mv-pulse-1" />
                <div className="mv-pulse mv-pulse-2" />
                <div className="mv-pulse mv-pulse-3" />
            </div>
        </div>
    );
};

// ─── Lifecycle Visual ──────────────────────────────────────────────
const LifecycleVisual = () => {
    const [active, setActive] = useState(0);
    useEffect(() => { const t = setInterval(() => setActive(a => (a + 1) % 5), 2200); return () => clearInterval(t); }, []);
    const steps = [
        { icon: Mail, label: 'Offer', color: '#3b82f6', desc: 'Send personalized offer letters' },
        { icon: Briefcase, label: 'Onboard', color: '#10b981', desc: 'Guided checklist & docs' },
        { icon: Activity, label: 'Work', color: '#fb923c', desc: 'Daily attendance & payroll' },
        { icon: TrendingUp, label: 'Grow', color: '#a78bfa', desc: 'Reviews & development' },
        { icon: Award, label: 'Exit', color: '#f472b6', desc: 'Smooth offboarding' },
    ];
    return (
        <div className="lv" data-anim="lifecycle">
            <div className="lv-track">
                <div className="lv-line" /><div className="lv-progress" style={{ width: `${(active / 4) * 100}%` }} />
                {steps.map((s, i) => (
                    <div key={i} className={`lv-step ${i <= active ? 'on' : ''} ${i === active ? 'now' : ''}`} style={{ '--color': s.color }}>
                        <div className="lv-node"><s.icon size={18} />{i === active && <span className="lv-ring" />}</div>
                        <div className="lv-info"><strong>{s.label}</strong><span>{s.desc}</span></div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ─── Main Landing Page ─────────────────────────────────────────────
const LandingPage = () => {
    const navigate = useNavigate();
    const rootRef = useRef(null);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll, { passive: true });

        // Small delay to ensure DOM is fully painted before GSAP runs
        const timer = setTimeout(() => {

        // ─── GSAP ScrollTrigger Animations ─────────────────────────
        const ctx = gsap.context(() => {
            // Hero text stagger
            gsap.fromTo('.lp-hero .anim-text .lp-eyebrow, .lp-hero .anim-text .lp-h1, .lp-hero .anim-text .lp-sub, .lp-hero .anim-text .lp-ctas', 
                { y: 80, opacity: 0 },
                { y: 0, opacity: 1, duration: 1.2, stagger: 0.2, ease: 'power3.out' }
            );

            // Hero visual
            gsap.fromTo('.lp-hero .anim-visual',
                { scale: 0.7, opacity: 0 },
                { scale: 1, opacity: 1, duration: 1.5, delay: 0.6, ease: 'power3.out' }
            );

            // Each section animates in on scroll
            gsap.utils.toArray('.lp-section:not(.lp-hero)').forEach((section) => {
                const textEls = section.querySelectorAll('.anim-text .lp-tag, .anim-text .lp-eyebrow, .anim-text .lp-h2, .anim-text .lp-sub, .anim-text .lp-pain, .anim-text .lp-stats, .anim-text .lp-ctas, .anim-text .lp-cta');
                const visual = section.querySelector('.anim-visual');

                if (textEls.length) {
                    gsap.fromTo(textEls, 
                        { y: 60, opacity: 0 },
                        {
                            scrollTrigger: { trigger: section, start: 'top 75%', toggleActions: 'play none none none' },
                            y: 0, opacity: 1, duration: 1, stagger: 0.12, ease: 'power3.out',
                        }
                    );
                }

                if (visual) {
                    gsap.fromTo(visual,
                        { x: section.classList.contains('lp-reverse') ? -100 : 100, opacity: 0 },
                        {
                            scrollTrigger: { trigger: section, start: 'top 70%', toggleActions: 'play none none none' },
                            x: 0, opacity: 1, duration: 1.2, ease: 'power3.out',
                        }
                    );
                }
            });

            // Problem cards scatter in
            gsap.utils.toArray('[data-anim="scatter"]').forEach((card, i) => {
                gsap.fromTo(card,
                    { x: (i % 2 === 0 ? -1 : 1) * 100, y: 50, rotation: (i % 2 === 0 ? -15 : 15), opacity: 0 },
                    {
                        scrollTrigger: { trigger: card.closest('.lp-section'), start: 'top 70%' },
                        x: 0, y: 0, rotation: 0, opacity: 1, duration: 0.8, delay: i * 0.1, ease: 'back.out(1.5)',
                    }
                );
            });

            // Dashboard tilt in
            gsap.utils.toArray('[data-anim="dashboard"]').forEach((el) => {
                gsap.fromTo(el,
                    { rotateY: -20, rotateX: 10, scale: 0.8, opacity: 0 },
                    {
                        scrollTrigger: { trigger: el.closest('.lp-section'), start: 'top 70%' },
                        rotateY: 0, rotateX: 0, scale: 1, opacity: 1, duration: 1.4, ease: 'power3.out',
                    }
                );
            });

            // Float badges
            gsap.utils.toArray('[data-anim="float"]').forEach((el, i) => {
                gsap.fromTo(el,
                    { y: 40, opacity: 0 },
                    {
                        scrollTrigger: { trigger: el.closest('.lp-section'), start: 'top 60%' },
                        y: 0, opacity: 1, duration: 0.8, delay: 0.8 + i * 0.2, ease: 'power3.out',
                    }
                );
            });

            // Module tiles pop in
            gsap.utils.toArray('[data-anim="tile"]').forEach((tile, i) => {
                gsap.fromTo(tile,
                    { scale: 0, opacity: 0 },
                    {
                        scrollTrigger: { trigger: tile.closest('.lp-section'), start: 'top 70%' },
                        scale: 1, opacity: 1, duration: 0.5, delay: i * 0.04, ease: 'back.out(2)',
                    }
                );
            });

            // Lifecycle
            gsap.utils.toArray('[data-anim="lifecycle"]').forEach((el) => {
                gsap.fromTo(el,
                    { y: 60, opacity: 0 },
                    {
                        scrollTrigger: { trigger: el.closest('.lp-section'), start: 'top 70%' },
                        y: 0, opacity: 1, duration: 1, ease: 'power3.out',
                    }
                );
            });

            // Parallax on visuals
            gsap.utils.toArray('.anim-visual').forEach((el) => {
                gsap.to(el, {
                    scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 1 },
                    y: -50, ease: 'none',
                });
            });

        }, rootRef);

        }, 100); // end setTimeout

        return () => {
            window.removeEventListener('scroll', handleScroll);
            clearTimeout(timer);
            gsap.killTweensOf('*');
            ScrollTrigger.getAll().forEach(t => t.kill());
        };
    }, []);

    return (
        <div className="lp-root" ref={rootRef}>
            <div className="lp-bg"><div className="lp-bg-grad" /><div className="lp-bg-grid" /></div>

            <nav className={`lp-nav ${scrolled ? 'scrolled' : ''}`}>
                <div className="lp-nav-in">
                    <div className="lp-brand"><img src="/login.png" alt="" /><span><span className="b1">Indus</span><span className="b2">Innovate</span><span className="b3">HR</span></span></div>
                    <button className="lp-signin" onClick={() => navigate('/login')}><LogIn size={16} />Sign In</button>
                </div>
            </nav>

            {/* Hero */}
            <section className="lp-section lp-hero">
                <div className="lp-grid">
                    <div className="anim-text">
                        <div className="lp-eyebrow"><span className="lp-dot" />HUMAN RESOURCE INTELLIGENCE PLATFORM</div>
                        <h1 className="lp-h1">Run modern HR workflows with <span className="grad">speed</span>, <span className="grad">clarity</span>, and <span className="grad">control</span>.</h1>
                        <p className="lp-sub">IndusInnovate HR helps teams manage the entire employee lifecycle from a single platform — from first-day onboarding to monthly payroll and long-term performance growth.</p>
                        <div className="lp-ctas"><button className="lp-cta" onClick={() => navigate('/login')}>Get Started<ArrowRight size={18} /></button><a href="#problem" className="lp-cta lp-cta-sec">Learn More<ChevronDown size={18} /></a></div>
                    </div>
                    <div className="anim-visual"><HeroVisual /></div>
                </div>
                <div className="lp-scroll-hint"><span>SCROLL</span><ChevronDown size={20} /></div>
            </section>

            {/* Problem */}
            <section id="problem" className="lp-section lp-reverse">
                <div className="lp-grid">
                    <div className="anim-text">
                        <div className="lp-tag warn"><AlertTriangle size={12} />THE CHALLENGE</div>
                        <h2 className="lp-h2">Your HR stack is <span className="grad-warn">scattered</span> across a dozen disconnected tools.</h2>
                        <p className="lp-sub">Spreadsheets for attendance. A different app for payroll. Yet another for performance reviews. Data lives everywhere — and nowhere.</p>
                        <ul className="lp-pain"><li>Disconnected tools, fragmented data</li><li>Manual reconciliation eats your week</li><li>Slow approvals and stale reports</li><li>Compliance risks that grow silently</li></ul>
                    </div>
                    <div className="anim-visual"><ProblemVisual /></div>
                </div>
            </section>

            {/* Solution */}
            <section className="lp-section">
                <div className="lp-grid">
                    <div className="anim-text">
                        <div className="lp-tag"><Zap size={12} />THE UNIFICATION</div>
                        <h2 className="lp-h2">One platform.<br /><span className="grad">Every workflow.</span></h2>
                        <p className="lp-sub">Watch what happens when every HR signal flows into a single intelligent core. Attendance, payroll, performance, leave — all connected. Real-time. Always in sync.</p>
                        <div className="lp-stats"><div><strong>15+</strong><span>Modules</span></div><div><strong>1</strong><span>Source of truth</span></div><div><strong>0</strong><span>Spreadsheets</span></div></div>
                    </div>
                    <div className="anim-visual"><SolutionVisual /></div>
                </div>
            </section>

            {/* Modules */}
            <section className="lp-section lp-reverse">
                <div className="lp-grid">
                    <div className="anim-text">
                        <div className="lp-tag"><Layers size={12} />FULL CAPABILITIES</div>
                        <h2 className="lp-h2">Every module<br /><span className="grad">working as one.</span></h2>
                        <p className="lp-sub">Chat, drive, meetings, attendance, payroll, performance, surveys, helpdesk — unified under a single login, single audit trail, single experience.</p>
                        <button className="lp-cta" onClick={() => navigate('/login')}>Explore Dashboard<ArrowRight size={18} /></button>
                    </div>
                    <div className="anim-visual"><ModulesVisual /></div>
                </div>
            </section>

            {/* Lifecycle */}
            <section className="lp-section lp-stack">
                <div className="anim-text" style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto 60px' }}>
                    <div className="lp-tag" style={{ margin: '0 auto 28px' }}><Target size={12} />FULL EMPLOYEE LIFECYCLE</div>
                    <h2 className="lp-h2">From offer letter to <span className="grad">exit interview.</span></h2>
                    <p className="lp-sub" style={{ margin: '20px auto 0' }}>Every employee moment captured, connected, and contextual. Hire faster. Onboard smoother. Develop deeper. Offboard with grace.</p>
                </div>
                <div className="anim-visual" style={{ width: '100%' }}><LifecycleVisual /></div>
            </section>

            {/* CTA */}
            <section className="lp-section lp-final">
                <div className="lp-final-card">
                    <div className="lp-final-bg" />
                    <div className="anim-text" style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                        <div className="lp-eyebrow"><span className="lp-dot" />READY WHEN YOU ARE</div>
                        <h2 className="lp-h2">Sign in to <span className="grad">transform</span> your HR.</h2>
                        <p className="lp-sub" style={{ maxWidth: 600, margin: '0 auto 32px' }}>Your dashboard is ready. Step inside and explore everything IndusInnovate HR has to offer.</p>
                        <div className="lp-ctas" style={{ justifyContent: 'center' }}>
                            <button className="lp-cta lp-cta-lg" onClick={() => navigate('/login')}><LogIn size={18} />Sign In to Dashboard</button>
                            <a className="lp-cta lp-cta-sec lp-cta-lg" href="mailto:hello@indusinnovate.com"><Mail size={18} />Contact Sales</a>
                        </div>
                    </div>
                </div>
            </section>

            <footer className="lp-footer">
                <div className="lp-brand"><img src="/login.png" alt="" /><span><span className="b1">Indus</span><span className="b2">Innovate</span><span className="b3">HR</span></span></div>
                <span>© 2026 IndusInnovate Technologies — Innovating the future, the indus way.</span>
            </footer>
        </div>
    );
};

export default LandingPage;
