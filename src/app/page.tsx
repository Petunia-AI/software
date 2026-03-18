"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import {
  ArrowRight, ArrowUpRight, Play, Pause,
  Menu, X, ChevronRight, Zap, BarChart3, Video, Megaphone,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/* ─── Section color map ───────────────────────────────────────────────────── */
const SEC_BG: Record<string, string> = {
  hero:         "#08021a",
  manifesto:    "#021038",
  stats:        "#011e18",
  gallery:      "#12012a",
  features:     "#1a0500",
  video:        "#011c0c",
  testimonials: "#18011c",
  pricing:      "#04041e",
  cta:          "#160b00",
};

/* ─── Data ────────────────────────────────────────────────────────────────── */
const TICKER = [
  "GESTIÓN DE PROPIEDADES","CRM PIPELINE","CONTENIDO IA",
  "VIDEO AVATAR IA","META ADS","GOOGLE ADS",
  "CALENDARIO EDITORIAL","SEGUIMIENTO AUTOMATIZADO",
  "ANALYTICS","MARKETING MENSUAL IA",
];

const GALLERY = [
  { src: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=900&q=85", label: "Brickell Skyline" },
  { src: "https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=900&q=85", label: "Miami de Noche" },
  { src: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=900&q=85", label: "City Lights" },
  { src: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900&q=85", label: "Torre de Lujo" },
  { src: "https://images.unsplash.com/photo-1503891450247-ee5f8ec46dc3?w=900&q=85", label: "Ocean Drive" },
  { src: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=900&q=85", label: "Downtown Skyline" },
];

const FEATURES = [
  { n:"01", Icon:Zap,        tag:"IA GENERATIVA",     title:"Motor de IA",      sub:"Contenido que cierra",       body:"Genera copies, captions y guiones para Instagram, Facebook, WhatsApp y email en segundos.",     from:"#7c3aed", to:"#a855f7" },
  { n:"02", Icon:BarChart3,  tag:"GESTIÓN COMERCIAL", title:"CRM Pipeline",     sub:"Control total de leads",     body:"Pipeline visual en kanban. Cada lead con su historial, notas y seguimiento automatizado.",       from:"#0ea5e9", to:"#38bdf8" },
  { n:"03", Icon:Video,      tag:"INNOVACIÓN",         title:"Video IA Avatar",  sub:"El futuro del marketing",    body:"Crea videos con avatares hiperrealistas. La IA escribe el guión y el avatar lo presenta.",       from:"#10b981", to:"#34d399" },
  { n:"04", Icon:Megaphone,  tag:"ADS AUTOMATIZADOS", title:"Meta & Google Ads",sub:"Campañas desde aquí",        body:"Lanza y gestiona campañas en Meta y Google con segmentación inteligente para compradores reales.",from:"#f59e0b", to:"#fbbf24" },
];

const TESTIMONIALS = [
  { av:"MG", name:"María González",  role:"Broker Independiente · CDMX",     text:"Antes tardaba horas creando contenido. Ahora genero publicaciones para toda la semana en minutos.", from:"#7c3aed", to:"#a855f7" },
  { av:"CM", name:"Carlos Mendoza",  role:"Director Comercial · Monterrey",   text:"Cerramos un 35% más desde que implementamos Petunia. El CRM Pipeline me da visibilidad total.",    from:"#0ea5e9", to:"#38bdf8" },
  { av:"AR", name:"Ana Rodríguez",   role:"Agente RE/MAX · Guadalajara",      text:"Los videos con IA son increíbles. Mis clientes no pueden creer que un avatar presente sus propiedades.", from:"#ec4899", to:"#f472b6" },
];

/* ─── Component ───────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const [navSolid, setNavSolid] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [muted, setMuted]       = useState(true);
  const [rootBg, setRootBg]      = useState(SEC_BG.hero);
  const heroRef    = useRef<HTMLElement>(null);
  const cursorDot  = useRef<HTMLDivElement>(null);
  const cursorRing = useRef<HTMLDivElement>(null);

  /* Nav solid on scroll */
  useEffect(() => {
    const fn = () => setNavSolid(window.scrollY > 60);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  /* Smooth background color transition per section */
  useEffect(() => {
    const sectionEls = Object.keys(SEC_BG).map(id => document.getElementById(id)).filter(Boolean);
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            const id = (e.target as HTMLElement).id;
            if (SEC_BG[id]) setRootBg(SEC_BG[id]);
          }
        });
      },
      { threshold: 0.35 }
    );
    sectionEls.forEach(el => io.observe(el!));
    return () => io.disconnect();
  }, []);

  /* GSAP: Ken Burns · scroll parallax · scroll reveals · image parallax */
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    /* ── Hero entrance stagger (plays on load) ── */
    const heroRevEls = Array.from(document.querySelectorAll<HTMLElement>("#hero .rv, #hero .rv-l, #hero .rv-r, #hero .rv-s"));
    if (heroRevEls.length) {
      gsap.fromTo(heroRevEls,
        { opacity: 0, y: 55 },
        { opacity: 1, y: 0, duration: 1.2, ease: "power3.out", stagger: 0.13, delay: 0.25 }
      );
    }

    /* ── Hero Ken Burns on video (scale + pan, loops forever) ── */
    gsap.fromTo(".hero-media",
      { scale: 1.12, x: -25 },
      { scale: 1.2, x: 25, duration: 18, ease: "sine.inOut", repeat: -1, yoyo: true }
    );

    /* ── Hero scroll parallax: video slower, text faster ── */
    const heroEl = heroRef.current;
    if (heroEl) {
      gsap.to(".hero-media", {
        y: () => window.innerHeight * 0.45,
        ease: "none",
        scrollTrigger: { trigger: heroEl, start: "top top", end: "bottom top", scrub: 1.2 },
      });
      gsap.to(".hero-text", {
        y: () => window.innerHeight * 0.22,
        ease: "none",
        scrollTrigger: { trigger: heroEl, start: "top top", end: "bottom top", scrub: 1.6 },
      });
    }

    /* ── Scroll reveals for all non-hero sections ── */
    const revealGroups: { sel: string; from: gsap.TweenVars }[] = [
      { sel: ".rv",   from: { y: 80 } },
      { sel: ".rv-l", from: { x: -100, rotate: -1.5 } },
      { sel: ".rv-r", from: { x: 100,  rotate: 1.5 } },
      { sel: ".rv-s", from: { scale: 0.82, y: 50 } },
    ];
    revealGroups.forEach(({ sel, from }) => {
      (gsap.utils.toArray<HTMLElement>(sel) as HTMLElement[])
        .filter(el => !el.closest("#hero"))
        .forEach(el => {
          gsap.fromTo(el,
            { opacity: 0, ...from },
            {
              opacity: 1, y: 0, x: 0, scale: 1, rotate: 0,
              duration: 1.1, ease: "power3.out",
              scrollTrigger: { trigger: el, start: "top 93%", toggleActions: "play none none none" },
            }
          );
        });
    });

    /* ── Parallax on .par-img images ── */
    (gsap.utils.toArray<HTMLElement>(".par-wrap") as HTMLElement[]).forEach(wrap => {
      const img = wrap.querySelector<HTMLElement>(".par-img");
      if (!img) return;
      gsap.set(img, { scale: 1.22 });
      gsap.fromTo(img,
        { yPercent: -9 },
        {
          yPercent: 9, ease: "none",
          scrollTrigger: { trigger: wrap, start: "top bottom", end: "bottom top", scrub: 2 },
        }
      );
    });

    return () => { ScrollTrigger.getAll().forEach(t => t.kill()); };
  }, []);

  /* GSAP: Custom magnetic cursor */
  useEffect(() => {
    const dot  = cursorDot.current;
    const ring = cursorRing.current;
    if (!dot || !ring) return;

    const onMove = (e: MouseEvent) => {
      gsap.to(dot,  { x: e.clientX - 4,  y: e.clientY - 4,  duration: 0.01, overwrite: "auto" });
      gsap.to(ring, { x: e.clientX - 18, y: e.clientY - 18, duration: 0.22, ease: "power2.out", overwrite: "auto" });
    };
    const onEnter = () => {
      gsap.to(ring, { scale: 2.1, opacity: 0.75, borderColor: "rgba(167,139,250,.9)", duration: 0.28 });
      gsap.to(dot,  { opacity: 0, duration: 0.18 });
    };
    const onLeave = () => {
      gsap.to(ring, { scale: 1, opacity: 1, borderColor: "rgba(167,139,250,.55)", duration: 0.28 });
      gsap.to(dot,  { opacity: 1, duration: 0.18 });
    };

    window.addEventListener("mousemove", onMove);
    const interactives = document.querySelectorAll("a, button, [role='button']");
    interactives.forEach(el => {
      el.addEventListener("mouseenter", onEnter);
      el.addEventListener("mouseleave", onLeave);
    });
    return () => { window.removeEventListener("mousemove", onMove); };
  }, []);

  /* Counter animation */
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target as HTMLElement;
        const target = parseFloat(el.dataset.target || "0");
        const suffix = el.dataset.suffix || "";
        let start = 0;
        const dur = 2000;
        const step = (ts: number) => {
          if (!start) start = ts;
          const p = Math.min((ts - start) / dur, 1);
          const val = target * (1 - Math.pow(1 - p, 3));
          el.textContent = Math.floor(val).toLocaleString() + suffix;
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        io.unobserve(e.target);
      }),
      { threshold: 0.5 }
    );
    document.querySelectorAll(".cnt").forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div
      className="text-white overflow-x-hidden"
      style={{ backgroundColor: rootBg, transition: "background-color 0.9s ease" }}
    >
      {/* ── Custom cursor ─────────────────────────────────────────────── */}
      <div ref={cursorDot}  className="cursor-dot"  aria-hidden />
      <div ref={cursorRing} className="cursor-ring" aria-hidden />

      {/* ── Global CSS ────────────────────────────────────────────────── */}
      <style>{`
        body { margin:0; font-family: system-ui,-apple-system,sans-serif; }

        /* ── Ticker ── */
        @keyframes ticker { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        .tk { animation: ticker 28s linear infinite; }

        /* ── Orb breathing ── */
        @keyframes orb { 0%,100%{transform:scale(1) translate(0,0)} 33%{transform:scale(1.2) translate(25px,-20px)} 66%{transform:scale(0.85) translate(-20px,15px)} }
        .orb  { animation: orb 14s ease-in-out infinite; pointer-events:none; }
        .orb2 { animation: orb 18s ease-in-out infinite reverse; pointer-events:none; }
        .orb3 { animation: orb 22s ease-in-out infinite 5s; pointer-events:none; }

        /* ── Float ── */
        @keyframes flt { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        .flt { animation: flt 5s ease-in-out infinite; }

        /* ── Scroll reveal (initial hidden state – GSAP animates these) ── */
        .rv, .rv-l, .rv-r, .rv-s { opacity: 0; }

        /* ── Custom cursor (hidden on touch devices) ── */
        .cursor-dot  { position:fixed; top:0; left:0; width:8px; height:8px; border-radius:50%; background:#fff; pointer-events:none; z-index:9999; will-change:transform; mix-blend-mode:exclusion; }
        .cursor-ring { position:fixed; top:0; left:0; width:38px; height:38px; border-radius:50%; border:1.5px solid rgba(167,139,250,.55); pointer-events:none; z-index:9998; will-change:transform; }
        @media (hover:none) { .cursor-dot, .cursor-ring { display:none; } }

        /* ── Parallax image (GSAP sets initial scale) ── */
        .par-img { will-change:transform; transform-origin:center center; }

        /* ── Section wipe-up ── */
        .sec-wrap {
          clip-path: inset(0 0 100% 0 round 0px);
          transition: clip-path 1s cubic-bezier(.16,1,.3,1);
        }
        .sec-wrap.in { clip-path: inset(0 0 0% 0 round 0px); }

        /* ── Stagger delays ── */
        .d1{transition-delay:.06s}.d2{transition-delay:.18s}.d3{transition-delay:.30s}
        .d4{transition-delay:.42s}.d5{transition-delay:.54s}.d6{transition-delay:.66s}

        /* ── Gallery scrollbar ── */
        .gscr::-webkit-scrollbar{display:none}
        .gscr{-ms-overflow-style:none;scrollbar-width:none}

        /* ── Gradient text helpers ── */
        .gt-violet  { background:linear-gradient(135deg,#a78bfa,#f472b6); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
        .gt-blue    { background:linear-gradient(135deg,#38bdf8,#818cf8); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
        .gt-teal    { background:linear-gradient(135deg,#34d399,#22d3ee); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
        .gt-amber   { background:linear-gradient(135deg,#fbbf24,#fb923c); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
        .gt-rose    { background:linear-gradient(135deg,#f472b6,#fb923c); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }

        /* ── Hover lift ── */
        .lift { transition:transform .35s cubic-bezier(.16,1,.3,1), box-shadow .35s ease; }
        .lift:hover { transform:translateY(-8px) scale(1.01); }

        /* ── Shine effect ── */
        @keyframes shine { from{left:-120%} to{left:200%} }
        .shine { position:relative; overflow:hidden; }
        .shine::after {
          content:''; position:absolute; top:0; left:-120%; width:60%; height:100%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.1),transparent);
          transform:skewX(-15deg);
        }
        .shine:hover::after { animation: shine .6s ease forwards; }
      `}</style>

      {/* ── NAV ─────────────────────────────────────────────────────── */}
      <nav className={`fixed top-0 inset-x-0 z-50 h-16 flex items-center transition-all duration-500 ${navSolid ? "backdrop-blur-2xl border-b border-white/8" : ""}`}
        style={navSolid ? { backgroundColor: `${rootBg}e6` } : {}}>
        <div className="max-w-7xl mx-auto w-full px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
              style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", boxShadow: "0 0 20px #7c3aed50" }}>
              <Image src="/logo-petunia.svg" alt="Petunia" width={18} height={18} style={{ filter: "brightness(2)" }} />
            </div>
            <span className="text-sm font-black tracking-[0.18em] uppercase">Petunia AI</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {[["Funciones","#features"],["Precios","#pricing"],["Contacto","#contact"]].map(([l,h])=>(
              <a key={l} href={h} className="text-[13px] text-white/80 hover:text-white font-medium transition-colors">{l}</a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-[13px] text-white/80 hover:text-white font-medium transition-colors px-3 py-2">Iniciar sesión</Link>
            <Link href="/register" className="flex items-center gap-1.5 text-[13px] font-bold text-white px-4 py-2 rounded-lg hover:opacity-90 transition-all hover:scale-105 shadow-lg"
              style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", boxShadow: "0 0 20px #7c3aed40" }}>
              Comenzar gratis <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <button className="md:hidden text-white/50 hover:text-white" onClick={()=>setMenuOpen(v=>!v)}>
            {menuOpen ? <X className="size-5"/> : <Menu className="size-5"/>}
          </button>
        </div>
        {menuOpen && (
          <div className="absolute top-16 inset-x-0 backdrop-blur-2xl border-b border-white/8 px-6 py-5 space-y-3 md:hidden"
            style={{ backgroundColor: `${SEC_BG.hero}f5` }}>
            {[["Funciones","#features"],["Precios","#pricing"]].map(([l,h])=>(
              <a key={l} href={h} className="block text-sm text-white/50 hover:text-white py-1.5" onClick={()=>setMenuOpen(false)}>{l}</a>
            ))}
            <Link href="/register" className="block mt-2 text-center text-sm font-bold text-white py-3 rounded-xl"
              style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
              Comenzar gratis
            </Link>
          </div>
        )}
      </nav>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* HERO  — Deep violet-purple                                    */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section id="hero" ref={heroRef} className="relative h-screen min-h-[680px] flex items-end overflow-hidden">
        {/* Colored orbs */}
        <div className="orb  absolute top-1/3 left-1/4  w-[700px] h-[700px] rounded-full" style={{background:"radial-gradient(circle,#7c3aed 0%,transparent 70%)",filter:"blur(90px)",opacity:.45}}/>
        <div className="orb2 absolute bottom-1/3 right-1/4 w-[500px] h-[500px] rounded-full" style={{background:"radial-gradient(circle,#4f46e5 0%,transparent 70%)",filter:"blur(80px)",opacity:.30}}/>
        <video autoPlay muted={muted} loop playsInline
          className="hero-media absolute inset-0 w-full h-full object-cover opacity-30 will-change-transform"
          src="https://videos.pexels.com/video-files/3402837/3402837-uhd_2560_1440_25fps.mp4"
          poster="https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1600&q=80"/>
        <div className="absolute inset-0" style={{background:"linear-gradient(to top,#08021a 0%,#08021a30 60%,transparent 100%)"}}/>

        <div className="hero-text relative z-10 max-w-7xl mx-auto px-6 pb-20 md:pb-28 w-full">
          <div className="max-w-5xl">
            <div className="flex items-center gap-2.5 mb-5 rv d1">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse"/>
              <span className="text-[10px] font-black tracking-[0.35em] uppercase" style={{color:"#a78bfa80"}}>Sistema Operativo para Inmobiliarias</span>
            </div>
            <h1 className="text-[clamp(4rem,11vw,9.5rem)] font-black leading-[0.88] tracking-[-0.02em] uppercase mb-6">
              <span className="block rv d2">PETUNIA</span>
              <span className="block rv d3 gt-violet">AI</span>
            </h1>
            <p className="text-base md:text-lg max-w-lg leading-relaxed mb-10 rv d4" style={{color:"rgba(255,255,255,.5)"}}>
              Gestiona propiedades, genera contenido, capta leads y cierra más. IA construida exclusivamente para el mercado inmobiliario.
            </p>
            <div className="flex flex-wrap items-center gap-4 rv d5">
              <Link href="/register" className="inline-flex items-center gap-2 text-white font-black text-sm px-7 py-3.5 rounded-xl hover:opacity-90 transition-all hover:scale-105 shadow-xl"
                style={{background:"linear-gradient(135deg,#7c3aed,#4f46e5)",boxShadow:"0 8px 32px #7c3aed50"}}>
                Comenzar gratis <ArrowRight className="size-4"/>
              </Link>
              <button onClick={()=>setMuted(v=>!v)}
                className="inline-flex items-center gap-2 text-sm px-5 py-3.5 rounded-xl transition-all backdrop-blur-sm"
                style={{border:"1px solid rgba(124,58,237,.3)",color:"rgba(167,139,250,.7)"}}>
                {muted ? <Play className="size-4"/> : <Pause className="size-4"/>}
                {muted ? "Activar sonido" : "Silenciar"}
              </button>
            </div>
          </div>
        </div>
        <div className="absolute bottom-8 right-8 flex flex-col items-center gap-2 select-none" style={{color:"rgba(255,255,255,.15)"}}>
          <div className="w-px h-16" style={{background:"linear-gradient(to bottom,transparent,#7c3aed50)"}}/>
          <span className="text-[9px] tracking-[0.35em] uppercase mt-2">Scroll</span>
        </div>
      </section>

      {/* Ticker */}
      <div className="overflow-hidden py-4" style={{borderTop:"1px solid rgba(124,58,237,.15)",borderBottom:"1px solid rgba(124,58,237,.15)",background:"rgba(0,0,0,.3)"}}>
        <div className="flex tk whitespace-nowrap">
          {[...TICKER,...TICKER].map((t,i)=>(
            <span key={i} className="inline-flex items-center gap-5 px-7 text-[10px] font-black tracking-[0.3em] uppercase" style={{color:"rgba(167,139,250,.25)"}}>
              {t}<span style={{color:"#7c3aed"}}>✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MANIFESTO  — ROYAL BLUE                                       */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section id="manifesto" className="relative py-36 overflow-hidden">
        <div className="orb  absolute -top-40 -right-40 w-[800px] h-[800px] rounded-full" style={{background:"radial-gradient(circle,#1d4ed8 0%,transparent 65%)",filter:"blur(100px)",opacity:.55}}/>
        <div className="orb2 absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full" style={{background:"radial-gradient(circle,#0ea5e9 0%,transparent 65%)",filter:"blur(80px)",opacity:.35}}/>
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="rv-l">
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8" style={{background:"rgba(59,130,246,.15)",border:"1px solid rgba(59,130,246,.3)"}}>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"/>
                <span className="text-[10px] font-black tracking-[0.3em] uppercase text-blue-400">Nuestra visión</span>
              </div>
              <h2 className="text-[clamp(2.5rem,5vw,4.5rem)] font-black leading-[0.92] tracking-tight uppercase mb-8">
                EL MERCADO<br/>INMOBILIARIO<br/><span className="gt-blue">MERECE IA</span><br/>DE VERDAD.
              </h2>
              <p className="text-base leading-relaxed max-w-md mb-10" style={{color:"rgba(255,255,255,.5)"}}>
                No una herramienta genérica adaptada. Una plataforma construida desde cero para el agente, el broker y la inmobiliaria que quiere crecer inteligente.
              </p>
              <Link href="/register" className="inline-flex items-center gap-2 font-bold text-sm px-6 py-3 rounded-xl hover:opacity-90 transition-all hover:scale-105 shadow-lg group"
                style={{background:"linear-gradient(135deg,#1d4ed8,#0ea5e9)",boxShadow:"0 8px 32px #1d4ed840"}}>
                Ver la plataforma <ArrowUpRight className="size-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"/>
              </Link>
            </div>
            <div className="rv-r relative">
              <div className="par-wrap aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl" style={{boxShadow:"0 40px 80px rgba(29,78,216,.25)"}}>
                <img src="https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=900&q=85" alt="Brickell Miami" className="par-img w-full h-full object-cover"/>
                <div className="absolute inset-0" style={{background:"linear-gradient(to top,#021038cc 0%,transparent 60%)"}}/>
                <div className="absolute bottom-5 left-5 right-5 rounded-2xl p-4" style={{background:"rgba(255,255,255,.06)",backdropFilter:"blur(12px)",border:"1px solid rgba(255,255,255,.1)"}}>
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
                    <span className="text-xs" style={{color:"rgba(255,255,255,.6)"}}>IA generando contenido...</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{background:"rgba(255,255,255,.1)"}}>
                    <div className="h-full w-3/4 rounded-full animate-pulse" style={{background:"linear-gradient(90deg,#1d4ed8,#0ea5e9)"}}/>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-6 -left-6 rounded-2xl p-5 flt" style={{background:"linear-gradient(135deg,#1d4ed8,#0ea5e9)",boxShadow:"0 20px 50px rgba(29,78,216,.4)"}}>
                <p className="text-3xl font-black text-white">+35%</p>
                <p className="text-[11px] mt-0.5 font-semibold" style={{color:"rgba(255,255,255,.75)"}}>más cierres en promedio</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* STATS  — DEEP TEAL / EMERALD                                  */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section id="stats" className="relative py-28 overflow-hidden">
        <div className="orb  absolute top-0 left-0 w-[700px] h-[700px] rounded-full" style={{background:"radial-gradient(circle,#0d9488 0%,transparent 65%)",filter:"blur(100px)",opacity:.55}}/>
        <div className="orb3 absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full" style={{background:"radial-gradient(circle,#059669 0%,transparent 65%)",filter:"blur(80px)",opacity:.40}}/>
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="rv text-center mb-16">
            <div className="text-[10px] font-black tracking-[0.35em] uppercase mb-3" style={{color:"rgba(52,211,153,.5)"}}>Números reales</div>
            <h2 className="text-4xl lg:text-5xl font-black uppercase tracking-tight">
              RESULTADOS QUE <span className="gt-teal">HABLAN.</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {raw:2500, s:"+", label:"Propiedades gestionadas", c:"rgba(52,211,153,.12)", bc:"rgba(52,211,153,.2)", tc:"#34d399"},
              {raw:15000,s:"+", label:"Contenidos generados",    c:"rgba(34,211,238,.12)", bc:"rgba(34,211,238,.2)", tc:"#22d3ee"},
              {raw:850,  s:"+", label:"Videos IA creados",       c:"rgba(16,185,129,.12)", bc:"rgba(16,185,129,.2)", tc:"#10b981"},
              {raw:35,   s:"%", label:"Más cierres promedio",    c:"rgba(110,231,183,.12)",bc:"rgba(110,231,183,.2)",tc:"#6ee7b7"},
            ].map((s,i)=>(
              <div key={i} className={`rv-s d${i+1} rounded-2xl p-8 text-center`} style={{background:s.c, border:`1px solid ${s.bc}`}}>
                <p className="cnt text-[clamp(2rem,4vw,3.2rem)] font-black leading-none" style={{color:s.tc}} data-target={s.raw} data-suffix={s.s}>0{s.s}</p>
                <p className="text-[11px] mt-3 tracking-[0.14em] uppercase font-semibold leading-tight" style={{color:"rgba(255,255,255,.4)"}}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* GALLERY  — DEEP VIOLET/PURPLE                                 */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section id="gallery" className="relative py-28 overflow-hidden">
        <div className="orb  absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] rounded-full" style={{background:"radial-gradient(ellipse,#9333ea 0%,transparent 65%)",filter:"blur(120px)",opacity:.35}}/>
        <div className="relative max-w-7xl mx-auto px-6 mb-14">
          <div className="flex items-end justify-between">
            <div className="rv">
              <div className="text-[10px] font-black tracking-[0.35em] uppercase mb-3" style={{color:"rgba(216,180,254,.4)"}}>Miami · Brickell</div>
              <h2 className="text-4xl lg:text-5xl font-black uppercase tracking-tight leading-[0.95]">
                El mercado<br/><span className="gt-violet">más exclusivo.</span>
              </h2>
            </div>
            <Link href="/register" className="hidden md:flex items-center gap-2 text-sm transition-colors rv-r group" style={{color:"rgba(255,255,255,.3)"}}>
              Ver demo <ArrowUpRight className="size-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"/>
            </Link>
          </div>
        </div>
        <div className="flex gap-5 overflow-x-auto pb-4 px-6 gscr">
          {GALLERY.map((g,i)=>(
            <div key={i} className={`par-wrap rv d${Math.min(i+1,6)} shrink-0 w-[300px] md:w-[400px] aspect-[4/3] rounded-2xl overflow-hidden relative group cursor-pointer`}
              style={{boxShadow:"0 20px 60px rgba(0,0,0,.6)"}}>
              <img src={g.src} alt={g.label} className="par-img w-full h-full object-cover transition-[filter] duration-700 group-hover:brightness-110"/>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{background:"linear-gradient(to top,#12012acc,rgba(147,51,234,.2),transparent)"}}/>
              <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-300">
                <span className="text-sm font-bold tracking-wide text-white">{g.label}</span>
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{background:"rgba(147,51,234,.3)",backdropFilter:"blur(8px)",border:"1px solid rgba(216,180,254,.2)"}}>
                  <ArrowUpRight className="size-3.5 text-purple-300"/>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* FEATURES  — WARM AMBER/ORANGE                                 */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section id="features" className="relative py-28 overflow-hidden">
        <div className="orb  absolute -top-20 -left-20  w-[700px] h-[700px] rounded-full" style={{background:"radial-gradient(circle,#d97706 0%,transparent 65%)",filter:"blur(110px)",opacity:.40}}/>
        <div className="orb2 absolute -bottom-20 -right-20 w-[600px] h-[600px] rounded-full" style={{background:"radial-gradient(circle,#ea580c 0%,transparent 65%)",filter:"blur(90px)",opacity:.30}}/>
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="rv text-center mb-20">
            <div className="text-[10px] font-black tracking-[0.35em] uppercase mb-4" style={{color:"rgba(251,191,36,.5)"}}>Funcionalidades</div>
            <h2 className="text-4xl lg:text-6xl font-black uppercase tracking-tight">
              TODO LO QUE<br/><span className="gt-amber">NECESITAS.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {FEATURES.map((f,i)=>{
              const Icon = f.Icon;
              return (
                <div key={i} className={`lift ${i%2===0?"rv-l":"rv-r"} d${i+1} relative rounded-3xl p-8 overflow-hidden group cursor-default`}
                  style={{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.06)",boxShadow:`0 20px 60px rgba(0,0,0,.3)`}}>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" style={{background:`linear-gradient(135deg,${f.from}18,${f.to}10)`}}/>
                  <div className="relative">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-6 shadow-lg" style={{background:`linear-gradient(135deg,${f.from},${f.to})`,boxShadow:`0 8px 24px ${f.from}50`}}>
                      <Icon className="size-6 text-white"/>
                    </div>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <span className="text-[9px] font-black tracking-[0.2em] uppercase" style={{color:"rgba(255,255,255,.2)"}}>{f.tag}</span>
                        <h3 className="text-2xl font-black uppercase mt-1">{f.title}</h3>
                      </div>
                      <span className="text-5xl font-black leading-none" style={{color:"rgba(255,255,255,.04)"}}>{f.n}</span>
                    </div>
                    <p className="text-sm font-bold mb-3" style={{background:`linear-gradient(135deg,${f.from},${f.to})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>{f.sub}</p>
                    <p className="text-sm leading-relaxed" style={{color:"rgba(255,255,255,.45)"}}>{f.body}</p>
                    <div className="mt-6 flex items-center gap-1.5 text-xs transition-colors" style={{color:"rgba(255,255,255,.15)"}}>
                      <span>Explorar</span><ChevronRight className="size-3"/>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* VIDEO DEMO  — FOREST GREEN                                    */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section id="video" className="relative py-28 overflow-hidden">
        <div className="orb  absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] rounded-full" style={{background:"radial-gradient(ellipse,#059669 0%,transparent 65%)",filter:"blur(120px)",opacity:.40}}/>
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="rv text-center mb-14">
            <div className="text-[10px] font-black tracking-[0.35em] uppercase mb-4" style={{color:"rgba(52,211,153,.5)"}}>En Acción</div>
            <h2 className="text-4xl lg:text-6xl font-black uppercase tracking-tight">
              PETUNIA<br/><span className="gt-teal">EN ACCIÓN.</span>
            </h2>
          </div>
          <div className="rv-s relative rounded-3xl overflow-hidden aspect-video" style={{border:"1px solid rgba(16,185,129,.15)",boxShadow:"0 0 80px rgba(16,185,129,.1),0 40px 80px rgba(0,0,0,.5)"}}>
            <video autoPlay muted loop playsInline
              className="w-full h-full object-cover opacity-35"
              src="https://videos.pexels.com/video-files/3209828/3209828-uhd_2560_1440_25fps.mp4"
              poster="https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1600&q=80"/>
            <div className="absolute inset-0" style={{background:"linear-gradient(to top,#011c0ccc,transparent)"}}/>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 hover:scale-110 transition-transform cursor-pointer"
                  style={{background:"linear-gradient(135deg,#10b981,#34d399)",boxShadow:"0 0 50px rgba(16,185,129,.5)"}}>
                  <Play className="size-8 text-white fill-white ml-1"/>
                </div>
                <p className="text-xs tracking-[0.25em] uppercase font-bold" style={{color:"rgba(255,255,255,.4)"}}>Ver Demo Completa</p>
              </div>
            </div>
            <div className="absolute bottom-5 left-5">
              <div className="rounded-xl px-4 py-2.5 flex items-center gap-2.5" style={{background:"rgba(0,0,0,.5)",backdropFilter:"blur(12px)",border:"1px solid rgba(16,185,129,.2)"}}>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"/>
                <span className="text-xs font-medium" style={{color:"rgba(255,255,255,.6)"}}>Petunia IA generando contenido...</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TESTIMONIALS  — DEEP ROSE / MAGENTA                          */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section id="testimonials" className="relative py-28 overflow-hidden">
        <div className="orb  absolute top-0 right-0 w-[700px] h-[700px] rounded-full" style={{background:"radial-gradient(circle,#db2777 0%,transparent 65%)",filter:"blur(100px)",opacity:.40}}/>
        <div className="orb2 absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full" style={{background:"radial-gradient(circle,#e11d48 0%,transparent 65%)",filter:"blur(80px)",opacity:.30}}/>
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="rv text-center mb-16">
            <div className="text-[10px] font-black tracking-[0.35em] uppercase mb-4" style={{color:"rgba(244,114,182,.5)"}}>Resultados Reales</div>
            <h2 className="text-4xl lg:text-6xl font-black uppercase tracking-tight">
              LO QUE DICEN<br/><span className="gt-rose">NUESTROS CLIENTES.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t,i)=>(
              <div key={i} className={`rv-s d${i+1} rounded-3xl p-8 relative overflow-hidden`}
                style={{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.06)"}}>
                <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl" style={{background:`linear-gradient(90deg,${t.from},${t.to})`}}/>
                <div className="absolute inset-0 opacity-5 rounded-3xl" style={{background:`linear-gradient(135deg,${t.from},${t.to})`}}/>
                <div className="relative">
                  <div className="text-5xl font-black mb-4 leading-none" style={{color:"rgba(255,255,255,.07)"}}>"</div>
                  <p className="text-base leading-relaxed mb-8 italic" style={{color:"rgba(255,255,255,.6)"}}>"{t.text}"</p>
                  <div className="flex items-center gap-3 pt-5" style={{borderTop:"1px solid rgba(255,255,255,.06)"}}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0 shadow-lg"
                      style={{background:`linear-gradient(135deg,${t.from},${t.to})`,boxShadow:`0 8px 20px ${t.from}50`}}>
                      {t.av}
                    </div>
                    <div>
                      <p className="text-sm font-bold leading-tight">{t.name}</p>
                      <p className="text-[11px] mt-0.5" style={{color:"rgba(255,255,255,.3)"}}>{t.role}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* PRICING  — DEEP INDIGO / COBALT                               */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section id="pricing" className="relative py-28 overflow-hidden">
        <div className="orb  absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[500px] rounded-full" style={{background:"radial-gradient(ellipse,#4f46e5 0%,transparent 65%)",filter:"blur(120px)",opacity:.35}}/>
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="rv text-center mb-16">
            <div className="text-[10px] font-black tracking-[0.35em] uppercase mb-4" style={{color:"rgba(129,140,248,.4)"}}>Inversión</div>
            <h2 className="text-4xl lg:text-6xl font-black uppercase tracking-tight">
              PLANES SIMPLES.<br/><span className="gt-violet">RESULTADOS REALES.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {name:"Starter",     price:"$49",   period:"/mes", featured:false,
               features:["50 propiedades","100 contenidos IA / mes","CRM Pipeline básico","1 usuario","Soporte por email"],
               cta:"Comenzar gratis", from:"#334155", to:"#1e293b"},
              {name:"Professional",price:"$149",  period:"/mes", featured:true,
               features:["Propiedades ilimitadas","500 contenidos IA / mes","10 videos IA / mes","Meta & Google Ads","10 usuarios","Soporte prioritario"],
               cta:"Prueba 14 días gratis", from:"#4f46e5", to:"#7c3aed"},
              {name:"Enterprise",  price:"Custom",period:"",     featured:false,
               features:["Todo en Professional","Videos IA ilimitados","API access","White label","Usuarios ilimitados","Onboarding dedicado"],
               cta:"Contactar ventas", from:"#334155", to:"#1e293b"},
            ].map((plan,i)=>(
              <div key={i} className={`shine rv-s d${i+1} relative rounded-3xl p-8 overflow-hidden`}
                style={{
                  background: plan.featured ? `linear-gradient(135deg,${plan.from},${plan.to})` : "rgba(255,255,255,.04)",
                  border: plan.featured ? "none" : "1px solid rgba(255,255,255,.07)",
                  boxShadow: plan.featured ? `0 20px 60px ${plan.from}40` : "none",
                }}>
                {plan.featured && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[9px] font-black px-4 py-1.5 rounded-full tracking-[0.2em] uppercase" style={{background:"linear-gradient(135deg,#fbbf24,#fb923c)",color:"#0f0f0f",boxShadow:"0 8px 20px rgba(251,191,36,.4)"}}>
                    Más popular
                  </div>
                )}
                <p className="text-[10px] font-black tracking-[0.3em] uppercase mb-4" style={{color:"rgba(255,255,255,.4)"}}>{plan.name}</p>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-5xl font-black">{plan.price}</span>
                  <span className="text-sm" style={{color:"rgba(255,255,255,.35)"}}>{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f,j)=>(
                    <li key={j} className="flex items-center gap-2.5 text-sm" style={{color:"rgba(255,255,255,.65)"}}>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{background: plan.featured ? "#fbbf24" : "#6366f1"}}/>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register"
                  className="block text-center text-sm font-bold py-3.5 rounded-xl transition-all hover:scale-105"
                  style={plan.featured
                    ? {background:"rgba(255,255,255,.95)",color:"#4f46e5",boxShadow:"0 8px 20px rgba(0,0,0,.3)"}
                    : {border:"1px solid rgba(255,255,255,.1)",color:"white"}}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* FINAL CTA  — DEEP AMBER / GOLD                                */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section id="cta" className="relative py-44 overflow-hidden">
        <div className="orb  absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] rounded-full" style={{background:"radial-gradient(ellipse,#d97706 0%,transparent 65%)",filter:"blur(120px)",opacity:.45}}/>
        <div className="absolute inset-0" style={{background:"linear-gradient(to top,#160b00 0%,transparent 50%,#160b00 100%)"}}>
          <img src="https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1800&q=80" alt="" className="w-full h-full object-cover opacity-5"/>
        </div>
        <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
          <div className="rv">
            <div className="text-[10px] font-black tracking-[0.35em] uppercase mb-6" style={{color:"rgba(251,191,36,.6)"}}>Empieza hoy</div>
            <h2 className="text-[clamp(3rem,9vw,8rem)] font-black leading-[0.88] tracking-[-0.02em] uppercase mb-8">
              TU PRÓXIMO<br/>CIERRE<br/><span className="gt-amber">EMPIEZA AQUÍ.</span>
            </h2>
            <p className="text-base max-w-sm mx-auto mb-10 leading-relaxed" style={{color:"rgba(255,255,255,.4)"}}>
              Únete a cientos de agentes que ya cierran más con IA. Sin permanencia. Sin tarjeta de crédito.
            </p>
            <Link href="/register"
              className="inline-flex items-center gap-2.5 font-black text-sm px-10 py-4 rounded-xl hover:opacity-90 hover:scale-105 transition-all"
              style={{background:"linear-gradient(135deg,#f59e0b,#ea580c)",color:"#0f0800",boxShadow:"0 12px 40px rgba(245,158,11,.4)"}}>
              Comenzar gratis ahora <ArrowRight className="size-4"/>
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact" className="py-16 relative" style={{borderTop:"1px solid rgba(255,255,255,.05)"}}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-start justify-between gap-12 mb-14">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg" style={{background:"linear-gradient(135deg,#7c3aed,#a855f7)",boxShadow:"0 0 20px #7c3aed40"}}>
                  <Image src="/logo-petunia.svg" alt="Petunia" width={18} height={18} style={{filter:"brightness(2)"}}/>
                </div>
                <span className="text-sm font-black tracking-[0.18em] uppercase">Petunia AI</span>
              </div>
              <p className="text-sm max-w-[220px] leading-relaxed" style={{color:"rgba(255,255,255,.25)"}}>El sistema operativo para el mercado inmobiliario moderno.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-10 text-sm">
              {[
                {title:"Producto",links:["Funciones","Precios","Demo"]},
                {title:"Empresa", links:["Nosotros","Blog","Contacto"]},
                {title:"Legal",   links:["Privacidad","Términos","Cookies"]},
              ].map(col=>(
                <div key={col.title}>
                  <p className="text-[9px] font-black tracking-[0.25em] uppercase mb-3" style={{color:"rgba(255,255,255,.2)"}}>{col.title}</p>
                  {col.links.map(l=>(
                    <a key={l} href="#" className="block py-1 transition-colors text-[13px]" style={{color:"rgba(255,255,255,.3)"}}>{l}</a>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-3" style={{borderTop:"1px solid rgba(255,255,255,.05)"}}>
            <p className="text-xs" style={{color:"rgba(255,255,255,.2)"}}>© 2026 Petunia AI. Todos los derechos reservados.</p>
            <p className="text-[10px] font-black tracking-[0.4em] uppercase" style={{color:"rgba(255,255,255,.08)"}}>ALWAYS CLOSING.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
