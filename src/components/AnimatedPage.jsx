import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import gsap from 'gsap';

const AnimatedPage = ({ children }) => {
    const containerRef = useRef(null);
    const location = useLocation();

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const ctx = gsap.context(() => {
            // Page entrance
            gsap.fromTo(el, 
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out' }
            );

            // Headings slide in with blur
            gsap.fromTo(el.querySelectorAll('h1, h2'),
                { opacity: 0, y: 20, filter: 'blur(6px)' },
                { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.6, stagger: 0.1, ease: 'power3.out', delay: 0.1 }
            );

            // Cards stagger pop in
            gsap.fromTo(el.querySelectorAll('.card'),
                { opacity: 0, y: 30, scale: 0.96 },
                { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.06, ease: 'back.out(1.2)', delay: 0.15 }
            );

            // Stat numbers (large text in cards)
            gsap.fromTo(el.querySelectorAll('[style*="font-size: 2"], [style*="font-size: 3"], [style*="fontSize"]'),
                { opacity: 0, scale: 0.8 },
                { opacity: 1, scale: 1, duration: 0.5, stagger: 0.05, ease: 'back.out(1.5)', delay: 0.2 }
            );

            // Table rows cascade
            const rows = el.querySelectorAll('table tbody tr');
            if (rows.length > 0) {
                gsap.fromTo(rows,
                    { opacity: 0, x: -15 },
                    { opacity: 1, x: 0, duration: 0.35, stagger: 0.03, ease: 'power2.out', delay: 0.25 }
                );
            }

            // Buttons slide up
            gsap.fromTo(el.querySelectorAll('.btn-primary, .btn-secondary, button[class*="btn"]'),
                { opacity: 0, y: 10 },
                { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out', delay: 0.3 }
            );

            // Input fields fade in
            gsap.fromTo(el.querySelectorAll('input, select, textarea'),
                { opacity: 0, y: 8 },
                { opacity: 1, y: 0, duration: 0.3, stagger: 0.03, ease: 'power2.out', delay: 0.2 }
            );

            // Status badges pop
            gsap.fromTo(el.querySelectorAll('.status-badge'),
                { opacity: 0, scale: 0.7 },
                { opacity: 1, scale: 1, duration: 0.3, stagger: 0.04, ease: 'back.out(2)', delay: 0.35 }
            );

            // Avatars scale in
            gsap.fromTo(el.querySelectorAll('.avatar, img[style*="border-radius: 50%"]'),
                { opacity: 0, scale: 0.5, rotation: -10 },
                { opacity: 1, scale: 1, rotation: 0, duration: 0.4, stagger: 0.05, ease: 'back.out(1.5)', delay: 0.2 }
            );

            // Charts grow
            gsap.fromTo(el.querySelectorAll('.recharts-bar-rectangle, .recharts-area-area, .recharts-line-curve'),
                { opacity: 0, scaleY: 0 },
                { opacity: 1, scaleY: 1, duration: 0.8, ease: 'power3.out', delay: 0.4, transformOrigin: 'bottom' }
            );

        }, el);

        return () => ctx.revert();
    }, [location.pathname]);

    return (
        <div ref={containerRef} style={{ minHeight: '100%' }}>
            {children}
        </div>
    );
};

export default AnimatedPage;
