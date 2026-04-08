import React, { useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import './LandingPage.css';

const features = [
  'Attendance automation',
  'Leave lifecycle',
  'Payroll controls',
  'Performance insights',
];

const projectSignals = [
  { label: 'Attendance', icon: 'clock', tag: 'Core' },
  { label: 'Leave', icon: 'calendar', tag: 'Core' },
  { label: 'Payroll', icon: 'wallet', tag: 'Finance' },
  { label: 'Performance', icon: 'chart', tag: 'Growth' },
  { label: 'Onboarding', icon: 'users', tag: 'People' },
  { label: 'Compliance', icon: 'shield', tag: 'Risk' },
  { label: 'Chat', icon: 'chat', tag: 'Collab' },
  { label: 'Drive', icon: 'folder', tag: 'Docs' },
  { label: 'Meetings', icon: 'meet', tag: 'Collab' },
  { label: 'Notifications', icon: 'bell', tag: 'Alerts' },
  { label: 'Shifts', icon: 'clock', tag: 'Ops' },
  { label: 'Expense approvals', icon: 'wallet', tag: 'Finance' },
  { label: 'Reports', icon: 'chart', tag: 'Insights' },
  { label: 'Analytics', icon: 'chart', tag: 'Insights' },
];

const signalIconPaths = {
  clock: 'M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9Zm1 9.4V7h-2v6.2l4.7 2.8 1-1.7Z',
  calendar: 'M7 2h2v2h6V2h2v2h3v18H4V4h3V2Zm11 8H6v10h12V10Z',
  wallet: 'M4 7h16a2 2 0 0 1 2 2v8a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V9a2 2 0 0 1 2-2Zm12 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z',
  chart: 'M4 19h16v2H2V3h2v16Zm3-2h2v-6H7v6Zm4 0h2V7h-2v10Zm4 0h2V10h-2v7Z',
  users: 'M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4ZM8 13a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm8 1c-2.7 0-8 1.3-8 4v2h16v-2c0-2.7-5.3-4-8-4ZM8 15c-2.2 0-6 1.1-6 3v2h5v-2c0-1.1.6-2.1 1.7-2.9A4.7 4.7 0 0 0 8 15Z',
  shield: 'M12 2 4 5v6c0 5 3.4 9.5 8 11 4.6-1.5 8-6 8-11V5l-8-3Zm0 10.8 4.2-4.2 1.4 1.4L12 15.6l-3.6-3.6 1.4-1.4Z',
  chat: 'M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
  folder: 'M2 6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v2H2V6Zm0 4h22v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8Z',
  meet: 'M4 6h11a2 2 0 0 1 2 2v2.2l3.6-2a1 1 0 0 1 1.4.9v5.8a1 1 0 0 1-1.4.9L17 14v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z',
  bell: 'M12 2a6 6 0 0 0-6 6v3.2L4 14v2h16v-2l-2-2.8V8a6 6 0 0 0-6-6Zm0 20a3 3 0 0 0 2.8-2h-5.6A3 3 0 0 0 12 22Z',
};

const storyMilestones = [
  {
    key: 'speed',
    title: 'Workflow speed',
    line: 'Approvals move faster with automated routing and instant alerts.',
  },
  {
    key: 'unified',
    title: 'Unified HR ops',
    line: 'Attendance, leave, payroll, and performance run in one connected flow.',
  },
  {
    key: 'visibility',
    title: 'Live visibility',
    line: 'Teams track requests and workforce status in real time.',
  },
];

const testimonials = [
  {
    name: 'Neha Kapoor',
    role: 'HR Manager, Vantage Retail',
    avatar: '/reviews/reviewer-1.svg',
    review: 'IndusOneHR reduced our approval turnaround significantly. Leave, attendance, and payroll now run in one clean workflow.',
  },
  {
    name: 'Rahul Menon',
    role: 'Operations Head, Verity Logistics',
    avatar: '/reviews/reviewer-2.svg',
    review: 'The real-time visibility is a huge advantage. We can track requests, shifts, and exceptions instantly without spreadsheet chasing.',
  },
  {
    name: 'Aisha Thomas',
    role: 'People Partner, Nova Healthcare',
    avatar: '/reviews/reviewer-3.svg',
    review: 'Our onboarding and payroll coordination used to be fragmented. IndusOneHR brought everything into one reliable platform.',
  },
  {
    name: 'Karan Bedi',
    role: 'Admin Lead, Orbit Solutions',
    avatar: '/reviews/reviewer-4.svg',
    review: 'The interface is simple, fast, and practical for teams. Managers and employees both adopted it quickly with minimal training.',
  },
];

const partnerLogos = [
  'partner-1.png',
  'partner-2.png',
  'partner-3.png',
  'partner-4.png',
  'partner-5.png',
  'partner-6.png',
];

const LandingPage = () => {
  const { profile } = useAuth();
  const landingRootRef = useRef(null);
  const networkCanvasRef = useRef(null);
  const pointerRef = useRef({ x: 0, y: 0, active: false });
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);
  const [typedFeatureText, setTypedFeatureText] = useState('');
  const [typingPhase, setTypingPhase] = useState('typing');
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [contactStatus, setContactStatus] = useState({ type: '', message: '' });
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    company: '',
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveFeatureIndex((currentIndex) => (currentIndex + 1) % features.length);
    }, 2400);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const root = landingRootRef.current;
    const canvas = networkCanvasRef.current;
    if (!root || !canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let rafId = null;
    let width = 0;
    let height = 0;

    const clusters = [];
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    const buildClusters = () => {
      clusters.length = 0;
      const baseCount = width < 800 ? 6 : 9;

      for (let i = 0; i < baseCount; i += 1) {
        const centerX = Math.random() * width;
        const centerY = Math.random() * height;
        const nodeCount = 4 + Math.floor(Math.random() * 4);
        const radius = width < 800 ? 56 : 72;
        const nodes = [];

        for (let j = 0; j < nodeCount; j += 1) {
          nodes.push({
            orbitRadius: radius * (0.35 + Math.random() * 0.7),
            angle: Math.random() * Math.PI * 2,
            speed: (Math.random() * 0.0015 + 0.0008) * (Math.random() > 0.5 ? 1 : -1),
            size: 1.1 + Math.random() * 1.8,
            wobblePhase: Math.random() * Math.PI * 2,
            wobbleAmount: 3 + Math.random() * 6,
          });
        }

        clusters.push({
          x: centerX,
          y: centerY,
          vx: (Math.random() - 0.5) * 0.16,
          vy: (Math.random() - 0.5) * 0.16,
          driftPhase: Math.random() * Math.PI * 2,
          nodes,
        });
      }
    };

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = root.clientWidth;
      height = root.clientHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      pointerRef.current = {
        x: width * 0.5,
        y: Math.min(height * 0.35, 320),
        active: true,
      };

      buildClusters();
    };

    const drawSciFiBackdrop = (time, pointer) => {
      const gridSpacing = width < 900 ? 44 : 52;
      const drift = (time * 0.018) % gridSpacing;

      context.save();
      context.globalCompositeOperation = 'source-over';

      // Horizontal moving scan grid
      for (let y = -gridSpacing; y < height + gridSpacing; y += gridSpacing) {
        const yPos = y + drift;
        const alpha = 0.04 + ((yPos % (gridSpacing * 3)) / (gridSpacing * 3)) * 0.08;
        context.beginPath();
        context.moveTo(0, yPos);
        context.lineTo(width, yPos);
        context.strokeStyle = `rgba(56, 189, 248, ${alpha.toFixed(3)})`;
        context.lineWidth = 1;
        context.stroke();
      }

      // Vertical cyber lines
      const colSpacing = width < 900 ? 72 : 86;
      const colDrift = (time * 0.01) % colSpacing;
      for (let x = -colSpacing; x < width + colSpacing; x += colSpacing) {
        const xPos = x + colDrift;
        context.beginPath();
        context.moveTo(xPos, 0);
        context.lineTo(xPos, height);
        context.strokeStyle = 'rgba(59, 130, 246, 0.035)';
        context.lineWidth = 1;
        context.stroke();
      }

      // Cursor-centered holographic glow and reveal aura
      const pointerGlow = context.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 280);
      pointerGlow.addColorStop(0, pointer.active ? 'rgba(56, 189, 248, 0.26)' : 'rgba(56, 189, 248, 0.12)');
      pointerGlow.addColorStop(0.45, 'rgba(59, 130, 246, 0.12)');
      pointerGlow.addColorStop(1, 'rgba(37, 99, 235, 0)');
      context.fillStyle = pointerGlow;
      context.fillRect(0, 0, width, height);

      // Periodic top-to-bottom scan pulse
      if (!reducedMotion) {
        const scanY = (time * 0.09) % (height + 180) - 90;
        const scanGradient = context.createLinearGradient(0, scanY - 22, 0, scanY + 22);
        scanGradient.addColorStop(0, 'rgba(56, 189, 248, 0)');
        scanGradient.addColorStop(0.45, 'rgba(56, 189, 248, 0.09)');
        scanGradient.addColorStop(0.5, 'rgba(125, 211, 252, 0.18)');
        scanGradient.addColorStop(0.55, 'rgba(56, 189, 248, 0.09)');
        scanGradient.addColorStop(1, 'rgba(56, 189, 248, 0)');
        context.fillStyle = scanGradient;
        context.fillRect(0, scanY - 24, width, 48);
      }

      context.restore();
    };

    const drawFrame = (timestamp) => {
      const t = timestamp || 0;
      context.clearRect(0, 0, width, height);

      const pointer = pointerRef.current;
      const nodeClouds = [];

      drawSciFiBackdrop(t, pointer);

      for (const cluster of clusters) {
        if (!reducedMotion) {
          cluster.driftPhase += 0.0025;
          cluster.x += cluster.vx + Math.sin(cluster.driftPhase) * 0.04;
          cluster.y += cluster.vy + Math.cos(cluster.driftPhase * 0.8) * 0.04;
        }

        if (cluster.x < -80 || cluster.x > width + 80) cluster.vx *= -1;
        if (cluster.y < -80 || cluster.y > height + 80) cluster.vy *= -1;
        cluster.x = clamp(cluster.x, -70, width + 70);
        cluster.y = clamp(cluster.y, -70, height + 70);

        const points = cluster.nodes.map((node) => {
          if (!reducedMotion) node.angle += node.speed;
          const pulse = Math.sin(t * 0.0016 + node.wobblePhase) * node.wobbleAmount;
          const x = cluster.x + Math.cos(node.angle) * (node.orbitRadius + pulse * 0.08);
          const y = cluster.y + Math.sin(node.angle) * (node.orbitRadius + pulse * 0.08);

          return { x, y, size: node.size };
        });

        nodeClouds.push(points);
      }

      for (const points of nodeClouds) {
        for (let i = 0; i < points.length; i += 1) {
          for (let j = i + 1; j < points.length; j += 1) {
            const a = points[i];
            const b = points[j];
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const distance = Math.hypot(dx, dy);
            if (distance > 110) continue;

            const midX = (a.x + b.x) / 2;
            const midY = (a.y + b.y) / 2;
            const pointerDistance = Math.hypot(midX - pointer.x, midY - pointer.y);
            const revealBoost = pointer.active ? Math.max(0, 1 - pointerDistance / 280) : 0;
            const alpha = 0.08 + (1 - distance / 110) * 0.24 + revealBoost * 0.52;

            context.beginPath();
            context.moveTo(a.x, a.y);
            context.lineTo(b.x, b.y);
            context.strokeStyle = `rgba(56, 189, 248, ${Math.min(alpha, 0.92)})`;
            context.lineWidth = 0.55 + revealBoost * 1.6;
            context.stroke();
          }
        }
      }

      for (const points of nodeClouds) {
        for (const point of points) {
          const pointerDistance = Math.hypot(point.x - pointer.x, point.y - pointer.y);
          const revealBoost = pointer.active ? Math.max(0, 1 - pointerDistance / 280) : 0;
          const radius = point.size + revealBoost * 2.15;

          context.beginPath();
          context.arc(point.x, point.y, radius, 0, Math.PI * 2);
          context.fillStyle = `rgba(186, 230, 253, ${0.38 + revealBoost * 0.58})`;
          context.fill();

          if (revealBoost > 0.18) {
            context.beginPath();
            context.arc(point.x, point.y, radius + 3 + revealBoost * 4, 0, Math.PI * 2);
            context.strokeStyle = `rgba(56, 189, 248, ${0.12 + revealBoost * 0.3})`;
            context.lineWidth = 0.6;
            context.stroke();
          }
        }
      }

      if (pointer.active) {
        context.beginPath();
        context.arc(pointer.x, pointer.y, 72, 0, Math.PI * 2);
        context.strokeStyle = 'rgba(56, 189, 248, 0.24)';
        context.lineWidth = 1.2;
        context.stroke();

        context.beginPath();
        context.arc(pointer.x, pointer.y, 116, 0, Math.PI * 2);
        context.strokeStyle = 'rgba(59, 130, 246, 0.12)';
        context.lineWidth = 0.9;
        context.stroke();
      }

      rafId = window.requestAnimationFrame(drawFrame);
    };

    resizeCanvas();
    rafId = window.requestAnimationFrame(drawFrame);
    window.addEventListener('resize', resizeCanvas);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  useEffect(() => {
    const currentFeature = features[activeFeatureIndex];
    let cancelled = false;
    let timeoutId;

    const typeText = (characterIndex = 0) => {
      if (cancelled) return;

      if (characterIndex <= currentFeature.length) {
        setTypingPhase('typing');
        setTypedFeatureText(currentFeature.slice(0, characterIndex));
        timeoutId = window.setTimeout(() => typeText(characterIndex + 1), 55);
        return;
      }

      setTypingPhase('pause');
      timeoutId = window.setTimeout(() => {
        if (cancelled) return;
        setTypingPhase('deleting');

        const deleteText = (nextLength) => {
          if (cancelled) return;

          if (nextLength >= 0) {
            setTypedFeatureText(currentFeature.slice(0, nextLength));
            timeoutId = window.setTimeout(() => deleteText(nextLength - 1), 28);
            return;
          }

          setTypingPhase('typing');
        };

        deleteText(currentFeature.length - 1);
      }, 1100);
    };

    typeText(0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [activeFeatureIndex]);

  const onContactChange = (event) => {
    const { name, value } = event.target;
    setContactForm((prev) => ({ ...prev, [name]: value }));
  };

  const onContactSubmit = async (event) => {
    event.preventDefault();
    if (isSubmittingContact) return;

    setIsSubmittingContact(true);
    setContactStatus({ type: '', message: '' });

    try {
      const response = await api.post('/contact', contactForm);
      if (response?.warning) {
        setContactStatus({ type: 'warning', message: response.warning });
      } else {
        setContactStatus({ type: 'success', message: 'Submitted successfully. Our team will contact you soon.' });
      }
      setContactForm({ name: '', email: '', company: '' });
    } catch (err) {
      setContactStatus({ type: 'error', message: err.message || 'Failed to submit details. Please try again.' });
    } finally {
      setIsSubmittingContact(false);
    }
  };

  const updateSpotlightPosition = (clientX, clientY, active = true) => {
    const root = landingRootRef.current;
    if (!root) return;

    const bounds = root.getBoundingClientRect();
    pointerRef.current = {
      x: clientX - bounds.left,
      y: clientY - bounds.top,
      active,
    };
  };

  const onRootMouseMove = (event) => {
    updateSpotlightPosition(event.clientX, event.clientY, true);
  };

  const onRootMouseLeave = () => {
    pointerRef.current = { ...pointerRef.current, active: false };
  };

  const onRootTouchMove = (event) => {
    const firstTouch = event.touches?.[0];
    if (!firstTouch) return;
    updateSpotlightPosition(firstTouch.clientX, firstTouch.clientY, true);
  };

  const onRootTouchEnd = () => {
    pointerRef.current = { ...pointerRef.current, active: false };
  };

  if (profile?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (profile?.role === 'hr') return <Navigate to="/hr/dashboard" replace />;
  if (profile?.role === 'employee') return <Navigate to="/employee/dashboard" replace />;

  return (
    <main
      ref={landingRootRef}
      className="landing-root"
      onMouseMove={onRootMouseMove}
      onMouseLeave={onRootMouseLeave}
      onTouchMove={onRootTouchMove}
      onTouchEnd={onRootTouchEnd}
    >
      <canvas ref={networkCanvasRef} className="landing-network-canvas" aria-hidden="true" />

      <div className="landing-orb landing-orb-a" aria-hidden="true" />
      <div className="landing-orb landing-orb-b" aria-hidden="true" />
      <div className="landing-orb landing-orb-c" aria-hidden="true" />

      <header className="landing-header">
        <div className="brand-wrap">
          <span className="brand-logo-shell">
            <img className="brand-logo" src="/login.png" alt="IndusOneHR" />
          </span>
        </div>
        <Link className="login-btn" to="/login" aria-label="Login">
          <span className="login-btn-wrapper">
            <svg className="login-btn-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
              />
            </svg>
            <span className="login-btn-text" aria-hidden="true">
              {'Login'.split('').map((letter, index) => (
                <span key={`${letter}-${index}`} className="login-letter">
                  {letter}
                </span>
              ))}
            </span>
          </span>
        </Link>
      </header>

      <section className="hero">
        <div className="hero-copy-wrap">
          <p className="eyebrow">Human Resource Intelligence Platform</p>
          <h2>Run modern HR workflows with speed, clarity, and control.</h2>
          <p className="hero-copy">
            IndusOneHR helps teams manage the entire employee lifecycle from a single platform,
            from first-day onboarding to monthly payroll and long-term performance growth.
          </p>
        </div>

        <div className="hero-logo-card">
          <div className="hero-logo-glow" />
          <div className="hero-ring ring-a" aria-hidden="true" />
          <div className="hero-ring ring-b" aria-hidden="true" />
          <div className="hero-visual-card hero-visual-top" aria-hidden="true">
            <span className="visual-label">Live workflow</span>
            <div className="visual-bars">
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
          <div className="hero-visual-card hero-visual-bottom" aria-hidden="true">
            <span className="visual-label">Employee pulse</span>
            <div className="visual-pulse">
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
          <img className="hero-logo" src="/login.png" alt="IndusOneHR" />
        </div>
      </section>

      <div className="contact-quick-action">
        <button
          type="button"
          className="contact-us-btn"
          onClick={() => {
            setContactStatus({ type: '', message: '' });
            setIsContactOpen(true);
          }}
        >
          Contact Us
        </button>
      </div>

      <section className="feature-spotlight" id="features">
        <div className="feature-spotlight-top">
          <h3>
            Features<span className="feature-colon">:</span>
          </h3>

          <div className="feature-spotlight-right" aria-live="polite" aria-atomic="true">
            <div className="feature-typewriter">
              <h4>{typedFeatureText}</h4>
              <span className={`type-cursor ${typingPhase}`} aria-hidden="true" />
            </div>
          </div>
        </div>

        <div className="feature-marquee" aria-label="IndusOneHR modules moving horizontally">
          <div className="feature-marquee-track">
            {[...projectSignals, ...projectSignals].map((item, index) => (
              <span key={`${item.label}-${index}`} className="feature-marquee-item">
                <span className={`signal-icon ${item.icon}`} aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                    <path d={signalIconPaths[item.icon]} />
                  </svg>
                </span>
                <span className="signal-label">{item.label}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="why-choose" aria-label="Why teams choose IndusOneHR">
        <div className="why-choose-head">
          <p>Why Teams Choose IndusOneHR</p>
        </div>

        <div className="timeline-strip" role="list">
          {storyMilestones.map((item, index) => (
            <article key={item.key} className="timeline-node" role="listitem" style={{ animationDelay: `${0.08 + index * 0.08}s` }}>
              <span className={`timeline-icon ${item.key}`} aria-hidden="true">
                {item.key === 'speed' && (
                  <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                    <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
                  </svg>
                )}
                {item.key === 'unified' && (
                  <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                    <path d="M4 5h6v6H4V5zm10 0h6v6h-6V5zM4 13h6v6H4v-6zm10 3h6v3h-6v-3z" />
                  </svg>
                )}
                {item.key === 'visibility' && (
                  <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                    <path d="M12 5c5.5 0 9.5 4.2 10.7 6.1.4.6.4 1.2 0 1.8C21.5 14.8 17.5 19 12 19S2.5 14.8 1.3 12.9c-.4-.6-.4-1.2 0-1.8C2.5 9.2 6.5 5 12 5zm0 3.2A3.8 3.8 0 1 0 12 16a3.8 3.8 0 0 0 0-7.8z" />
                  </svg>
                )}
              </span>
              <h4>{item.title}</h4>
              <p>{item.line}</p>
              {index < storyMilestones.length - 1 && <span className="timeline-connector" aria-hidden="true" />}
            </article>
          ))}
        </div>
      </section>

      <section className="reviews" aria-label="Customer reviews">
        <div className="reviews-head">
          <p>What Teams Say</p>
          <h3>Reviews From Different Organizations</h3>
        </div>

        <div className="reviews-grid">
          {testimonials.map((item, index) => (
            <article key={item.name} className="review-card" style={{ animationDelay: `${0.1 + index * 0.08}s` }}>
              <div className="review-person">
                <img src={item.avatar} alt={item.name} loading="lazy" />
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.role}</span>
                </div>
              </div>
              <p>{item.review}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="partners-footer" aria-label="Our partners">
        <div className="partners-head">
          <p>Our Partners</p>
        </div>

        <div className="partners-marquee" aria-label="Partner logos scrolling horizontally">
          <div className="partners-track">
            {[...partnerLogos, ...partnerLogos].map((logo, index) => (
              <div className="partner-logo-shell" key={`${logo}-${index}`}>
                <img src={`/partners/${logo}`} alt={`Partner ${index + 1}`} loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      </footer>

      <footer className="company-footer" aria-label="IndusOneHR company footer">
        <div className="company-footer-brand">
          <img src="/login.png" alt="IndusOneHR" />
          <strong>IndusOneHR</strong>
        </div>
        <span className="company-footer-meta">© 2026 IndusOneHR. All rights reserved.</span>
      </footer>

      {isContactOpen && (
        <div className="contact-modal-overlay" role="dialog" aria-modal="true" aria-label="Contact Us form">
          <div className="contact-modal">
            <div className="contact-modal-head">
              <h3>Contact Us</h3>
              <button
                type="button"
                className="contact-close-btn"
                onClick={() => setIsContactOpen(false)}
                aria-label="Close contact form"
              >
                x
              </button>
            </div>

            <form className="contact-form" onSubmit={onContactSubmit}>
              <label>
                Name
                <input
                  type="text"
                  name="name"
                  value={contactForm.name}
                  onChange={onContactChange}
                  required
                />
              </label>

              <label>
                Mail
                <input
                  type="email"
                  name="email"
                  value={contactForm.email}
                  onChange={onContactChange}
                  required
                />
              </label>

              <label>
                Company
                <input
                  type="text"
                  name="company"
                  value={contactForm.company}
                  onChange={onContactChange}
                  required
                />
              </label>

              {contactStatus.message && (
                <p className={`contact-status ${contactStatus.type}`}>{contactStatus.message}</p>
              )}

              <button type="submit" className="contact-submit-btn" disabled={isSubmittingContact}>
                {isSubmittingContact ? 'Submitting...' : 'Submit'}
              </button>
            </form>
          </div>
        </div>
      )}

    </main>
  );
};

export default LandingPage;
