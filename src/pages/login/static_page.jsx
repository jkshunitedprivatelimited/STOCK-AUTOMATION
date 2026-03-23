import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  ChevronRight,
  Shield,
  BadgeCheck,
  Building2,
  MapPin,
  Phone,
  Mail,
  Clock,
  Send,
  ExternalLink,
  Star,
  Lightbulb,
  Handshake,
  Link2,
  ScrollText,
  Sprout,
  Telescope,
  Target,
  Package,
  Briefcase,
  Coffee,
  TrendingUp,
  HardHat,
  ClipboardList,
  ArrowUp,
} from "lucide-react";

/* ─────────────────────────────────────────── constants ── */
const PRIMARY = "rgb(0,100,55)";
const PRIMARY_DARK = "rgb(0,80,45)";
const PRIMARY_LIGHT = "rgb(0,130,70)";

const NAV_LINKS = [
  { label: "About", href: "#about" },
  { label: "Our Brands", href: "#brands" },
  { label: "Services", href: "#services" },
  { label: "Vision", href: "#vision" },
  { label: "Values", href: "#values" },
  { label: "Company Info", href: "#company-info" },
  { label: "Contact", href: "#contact" },
];

/* ─────────────────────────────────────────── component ── */
const StaticPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showTopBtn, setShowTopBtn] = useState(false);
  const buttonRef = useRef(null);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
      setShowTopBtn(window.scrollY > 600);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id) => {
    setMobileMenuOpen(false);
    document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });
  };

  /* ──────────────── sub-components ──────────────── */

  const SectionTitle = ({ badge, title, subtitle }) => (
    <div className="text-center mb-14">
      {badge && (
        <span className="inline-block text-xs font-bold tracking-widest uppercase text-[rgb(0,100,55)] bg-[rgb(0,100,55)]/10 px-4 py-1.5 rounded-full mb-4">
          {badge}
        </span>
      )}
      <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-3 text-gray-500 max-w-2xl mx-auto text-lg">
          {subtitle}
        </p>
      )}
    </div>
  );

  const ServiceCard = ({ icon: Icon, title, desc }) => (
    <div className="group bg-white rounded-2xl p-7 shadow-sm border border-gray-100 hover:shadow-xl hover:border-[rgb(0,100,55)]/30 transition-all duration-300 hover:-translate-y-1">
      <div className="w-14 h-14 rounded-xl bg-[rgb(0,100,55)]/10 flex items-center justify-center mb-5 group-hover:bg-[rgb(0,100,55)] transition-colors duration-300">
        <Icon
          size={26}
          className="text-[rgb(0,100,55)] group-hover:text-white transition-colors duration-300"
        />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
    </div>
  );

  const ValueCard = ({ icon: Icon, title, desc }) => (
    <div className="text-center px-4 py-6">
      <div className="w-16 h-16 rounded-full bg-[rgb(0,100,55)]/10 flex items-center justify-center mx-auto mb-4">
        <Icon size={28} className="text-[rgb(0,100,55)]" />
      </div>
      <h4 className="font-bold text-gray-900 mb-1">{title}</h4>
      <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
    </div>
  );

  const InfoRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-4 p-4 rounded-xl bg-white shadow-sm border border-gray-100">
      <div className="w-10 h-10 rounded-lg bg-[rgb(0,100,55)]/10 flex items-center justify-center shrink-0">
        <Icon size={20} className="text-[rgb(0,100,55)]" />
      </div>
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
          {label}
        </p>
        <p className="text-gray-800 font-medium text-sm mt-0.5">{value}</p>
      </div>
    </div>
  );

  /* ──────────────── RENDER ──────────────── */
  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      {/* ═══════════════════ HEADER ═══════════════════ */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 bg-white ${
          scrolled ? "shadow-md" : "shadow-sm"
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-5 py-3">
          {/* Logo */}
          <button
            onClick={() => scrollTo("#hero")}
            className="flex items-center gap-2"
          >
            <img
              src="/logo.jpg"
              alt="JKSH United"
              className="h-11 w-11 rounded-full object-cover border-2 border-[rgb(0,100,55)]/40"
            />
            <div className="hidden sm:block leading-tight">
              <span className="block text-lg font-extrabold text-[rgb(0,100,55)]">
                JKSH United
              </span>
              <span className="block text-[10px] text-gray-400 -mt-0.5 tracking-wider">
                Private Limited
              </span>
            </div>
          </button>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((l) => (
              <button
                key={l.href}
                onClick={() => scrollTo(l.href)}
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-[rgb(0,100,55)] transition-colors rounded-lg hover:bg-[rgb(0,100,55)]/5"
              >
                {l.label}
              </button>
            ))}
            <button
              onClick={() => navigate("/login")}
              className="ml-3 bg-[rgb(0,100,55)] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-[rgb(0,80,45)] transition-colors shadow-sm"
            >
              Login
            </button>
          </nav>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t shadow-lg animate-[fadeIn_0.2s_ease]">
            <div className="max-w-7xl mx-auto px-5 py-4 flex flex-col gap-1">
              {NAV_LINKS.map((l) => (
                <button
                  key={l.href}
                  onClick={() => scrollTo(l.href)}
                  className="text-left px-4 py-3 rounded-lg text-gray-700 font-medium hover:bg-[rgb(0,100,55)]/5 hover:text-[rgb(0,100,55)] transition-colors"
                >
                  {l.label}
                </button>
              ))}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate("/login");
                }}
                className="mt-2 bg-[rgb(0,100,55)] text-white font-semibold px-5 py-3 rounded-lg text-center hover:bg-[rgb(0,80,45)] transition-colors"
              >
                Login
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ═══════════════════ HERO ═══════════════════ */}
      <section
        id="hero"
        className="relative overflow-hidden pt-28 pb-20 md:pt-36 md:pb-28"
        style={{
          background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 60%, rgb(0,60,35) 100%)`,
        }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-white/5" />

        <div className="relative max-w-7xl mx-auto px-5 flex flex-col md:flex-row items-center gap-12">
          {/* Text */}
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur px-4 py-1.5 rounded-full text-white/90 text-xs font-semibold mb-6">
              <BadgeCheck size={14} />
              Registered Private Limited Company
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight whitespace-nowrap">
              JKSH United Pvt. Ltd.
            </h1>
            <div className="mt-6 text-white/80 text-lg max-w-xl leading-relaxed space-y-4 text-justify md:text-left">
              <p>
                United by vision, driven by excellence. JKSH United Private Limited is a growth-oriented consumer brand company building scalable, experience-driven businesses across India.
              </p>
              <p>
                Home to <strong className="text-white">T&nbsp;Vanamm</strong> — India's modern tea café brand with 150+ franchise outlets — and <strong className="text-white">T&nbsp;Leaf</strong>, our premium tea brand delivering authentic Indian tea experiences.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-4 justify-center md:justify-start">
              <button
                onClick={() => scrollTo("#about")}
                className="bg-white text-[rgb(0,100,55)] font-bold px-7 py-3 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2 shadow-lg shadow-black/10"
              >
                Explore Company <ChevronRight size={18} />
              </button>
              <button
                onClick={() => scrollTo("#contact")}
                className="border-2 border-white/40 text-white font-bold px-7 py-3 rounded-lg hover:bg-white/10 transition-colors"
              >
                Contact Us
              </button>
            </div>
          </div>

          {/* Logo */}
          <div className="flex-shrink-0">
            <div className="w-52 h-52 md:w-64 md:h-64 rounded-full border-4 border-white/20 shadow-2xl overflow-hidden bg-white/10 backdrop-blur flex items-center justify-center">
              <img
                src="/logo.jpg"
                alt="JKSH United Logo"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Bottom badge */}
        <div className="relative max-w-7xl mx-auto px-5 mt-14">
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur border border-white/20 rounded-xl px-5 py-3">
            <Shield size={20} className="text-white/80" />
            <div className="text-white text-sm">
              <span className="font-bold">JKSH United</span>
              <span className="mx-2 text-white/40">·</span>
              <span className="text-white/70">
                Incorporated · Private Limited
              </span>
            </div>
            <span className="ml-2 inline-flex items-center gap-1 bg-emerald-400/20 text-emerald-300 text-xs font-bold px-2.5 py-1 rounded-full">
              <BadgeCheck size={12} /> Verified Entity
            </span>
          </div>
        </div>
      </section>

      {/* ═══════════════════ ABOUT ═══════════════════ */}
      <section id="about" className="py-20 md:py-28 bg-gray-50">
        <div className="max-w-5xl mx-auto px-5">
          <SectionTitle
            badge="Who We Are"
            title="About JKSH United"
            subtitle="JKSH United Private Limited is a professionally managed Indian Private Limited company focused on building and scaling consumer-facing brands."
          />

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12 space-y-6 text-gray-600 leading-relaxed">
            <p>
              JKSH United Private Limited is the{" "}
              <strong className="text-gray-900">parent company</strong> that
              owns and operates multiple consumer-facing brand units. Our
              brands —{" "}
              <strong className="text-gray-900">T&nbsp;Vanamm</strong> and{" "}
              <strong className="text-gray-900">T&nbsp;Leaf</strong> — serve
              India's growing demand for quality tea experiences through
              franchise-based and direct retail models.
            </p>
            <p>
              We operate with a strong commitment to quality, innovation, and
              franchise excellence — empowering entrepreneurs to build
              profitable businesses under trusted brand identities.
            </p>
            <p>
              From brand development to franchise operations, store design,
              and business support, JKSH United provides end-to-end
              infrastructure that enables our brands and partners to grow
              together.
            </p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mt-10">
            {[
              { label: "Registered Under", value: "MCA" },
              { label: "Compliance", value: "100%" },
              { label: "Country of Origin", value: "India" },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white rounded-xl p-5 text-center shadow-sm border border-gray-100"
              >
                <p className="text-2xl font-extrabold text-[rgb(0,100,55)]">
                  {s.value}
                </p>
                <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-semibold">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ OUR BRANDS ═══════════════════ */}
      <section id="brands" className="py-20 md:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-5">
          <SectionTitle
            badge="Our Brand Units"
            title="Brands Under JKSH United"
            subtitle="JKSH United Private Limited is the parent company powering India's next generation of consumer brands in the tea and café space."
          />

          {/* Parent → Brands visual */}
          <div className="flex flex-col items-center mb-12">
            <div className="flex items-center gap-3 bg-[rgb(0,100,55)] text-white px-6 py-3 rounded-xl shadow-lg">
              <img
                src="/logo.jpg"
                alt="JKSH United"
                className="h-10 w-10 rounded-full object-cover border-2 border-white/30"
              />
              <div>
                <p className="font-extrabold text-lg leading-tight">JKSH United Pvt. Ltd.</p>
                <p className="text-white/70 text-xs">Parent Company</p>
              </div>
            </div>
            {/* Connector */}
            <div className="w-px h-10 bg-gradient-to-b from-[rgb(0,100,55)] to-gray-300" />
            <div className="flex items-center gap-2">
              <div className="w-24 h-px bg-gray-300" />
              <div className="w-3 h-3 rounded-full border-2 border-[rgb(0,100,55)] bg-white" />
              <div className="w-24 h-px bg-gray-300" />
            </div>
            <div className="flex gap-6 mt-1">
              <div className="w-px h-6 bg-gray-300 ml-[calc(50%-3.5rem)]" />
              <div className="w-px h-6 bg-gray-300 mr-[calc(50%-3.5rem)]" />
            </div>
          </div>

          {/* Brand Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* T Vanamm */}
            <div className="group relative bg-white rounded-2xl border-2 border-gray-100 hover:border-[rgb(0,100,55)]/40 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[rgb(0,100,55)] to-[rgb(0,150,80)]" />
              <div className="p-8 flex flex-col items-center text-center">
                <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-[rgb(0,100,55)]/20 shadow-md mb-5 group-hover:border-[rgb(0,100,55)]/50 transition-colors">
                  <img
                    src="/t_vanamm_logo.png"
                    alt="T Vanamm"
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="inline-block bg-[rgb(0,100,55)]/10 text-[rgb(0,100,55)] text-xs font-bold px-3 py-1 rounded-full mb-3">
                  Flagship Brand
                </span>
                <h3 className="text-2xl font-extrabold text-gray-900 mb-2">
                  T Vanamm
                </h3>
                <p className="text-sm text-gray-400 font-semibold uppercase tracking-wider mb-3">
                  India's Modern Tea Café
                </p>
                <p className="text-gray-500 text-sm leading-relaxed">
                  A modern tea café concept operating across{" "}
                  <strong className="text-gray-800">150+ franchise locations</strong>{" "}
                  in India. Offering 120+ beverages including flavored teas,
                  milk teas, herbal teas, iced teas, specialty drinks, and
                  café-style quick bites.
                </p>
                <div className="flex items-center gap-4 mt-5 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><BadgeCheck size={14} className="text-[rgb(0,100,55)]" /> 150+ Outlets</span>
                  <span className="flex items-center gap-1"><BadgeCheck size={14} className="text-[rgb(0,100,55)]" /> 120+ Beverages</span>
                </div>
              </div>
            </div>

            {/* T Leaf */}
            <div className="group relative bg-white rounded-2xl border-2 border-gray-100 hover:border-[rgb(0,100,55)]/40 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[rgb(0,100,55)] to-[rgb(0,150,80)]" />
              <div className="p-8 flex flex-col items-center text-center">
                <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-[rgb(0,100,55)]/20 shadow-md mb-5 group-hover:border-[rgb(0,100,55)]/50 transition-colors">
                  <img
                    src="/t_leaf_logo.png"
                    alt="T Leaf"
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="inline-block bg-[rgb(0,100,55)]/10 text-[rgb(0,100,55)] text-xs font-bold px-3 py-1 rounded-full mb-3">
                  Premium Brand
                </span>
                <h3 className="text-2xl font-extrabold text-gray-900 mb-2">
                  T Leaf
                </h3>
                <p className="text-sm text-gray-400 font-semibold uppercase tracking-wider mb-3">
                  Premium Indian Tea Brand
                </p>
                <p className="text-gray-500 text-sm leading-relaxed">
                  A premium tea brand delivering authentic Indian tea
                  experiences. Focused on sourcing the finest tea leaves
                  and creating signature blends that celebrate India's rich
                  tea heritage with a modern, quality-first approach.
                </p>
                <div className="flex items-center gap-4 mt-5 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><BadgeCheck size={14} className="text-[rgb(0,100,55)]" /> Premium Blends</span>
                  <span className="flex items-center gap-1"><BadgeCheck size={14} className="text-[rgb(0,100,55)]" /> Signature Teas</span>
                </div>
              </div>
            </div>
          </div>

          {/* Parent company note */}
          <div className="mt-10 bg-gray-50 rounded-xl border border-gray-100 p-6 max-w-3xl mx-auto text-center">
            <p className="text-gray-500 text-sm leading-relaxed">
              Both{" "}<strong className="text-gray-800">T Vanamm</strong> and{" "}
              <strong className="text-gray-800">T Leaf</strong> are brand units
              wholly owned and operated by{" "}
              <strong className="text-[rgb(0,100,55)]">JKSH United Private Limited</strong>.
              All franchise operations, brand management, and business support
              are centrally managed by the parent company.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════ SERVICES ═══════════════════ */}
      <section id="services" className="py-20 md:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-5">
          <SectionTitle
            badge="What We Do"
            title="Our Services"
            subtitle="We deliver professional services across multiple sectors with a commitment to quality, transparency, and results."
          />

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <ServiceCard
              icon={Package}
              title="Franchise Development"
              desc="End-to-end franchise setup support including store design, interiors, and brand deployment for T Vanamm outlets across India."
            />
            <ServiceCard
              icon={Briefcase}
              title="Menu & Product Training"
              desc="Comprehensive training on all 120+ beverages and food items to ensure consistent taste and quality at every franchise outlet."
            />
            <ServiceCard
              icon={Coffee}
              title="Tea & Café Products"
              desc="A curated menu of 120+ beverages including flavored teas, milk teas, herbal teas, iced teas, specialty drinks, and café-style quick bites."
            />
            <ServiceCard
              icon={TrendingUp}
              title="Brand & Marketing Support"
              desc="Ready-to-use marketing assets, branding templates, and campaign support to help franchise partners drive local customer engagement."
            />
            <ServiceCard
              icon={HardHat}
              title="Operations & Compliance"
              desc="Detailed SOPs, operational manuals, and ongoing guidance to help franchise partners run smooth, standardized outlets."
            />
            <ServiceCard
              icon={ClipboardList}
              title="Business Growth Support"
              desc="Dedicated franchise support team assisting partners from onboarding through day-to-day operations and long-term business growth."
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════ VISION & MISSION ═══════════════════ */}
      <section id="vision" className="py-20 md:py-28 bg-gray-50">
        <div className="max-w-5xl mx-auto px-5">
          <SectionTitle badge="Vision & Mission" title="" />

          <div className="grid md:grid-cols-2 gap-6">
            {/* Vision */}
            <div className="relative bg-white rounded-2xl p-8 shadow-sm border border-gray-100 overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[rgb(0,100,55)] to-[rgb(0,150,80)]" />
              <div className="w-14 h-14 rounded-xl bg-[rgb(0,100,55)]/10 flex items-center justify-center mb-5">
                <Telescope size={28} className="text-[rgb(0,100,55)]" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Our Vision
              </h3>
              <p className="text-gray-500 leading-relaxed">
                To become one of India's most respected consumer brand
                companies — building businesses that redefine everyday
                experiences, empower entrepreneurs, and create value for
                millions of customers across the country.
              </p>
            </div>

            {/* Mission */}
            <div className="relative bg-white rounded-2xl p-8 shadow-sm border border-gray-100 overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[rgb(0,100,55)] to-[rgb(0,150,80)]" />
              <div className="w-14 h-14 rounded-xl bg-[rgb(0,100,55)]/10 flex items-center justify-center mb-5">
                <Target size={28} className="text-[rgb(0,100,55)]" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Our Mission
              </h3>
              <p className="text-gray-500 leading-relaxed">
                To develop, launch, and scale consumer-facing brands through
                proven franchise models, operational excellence, and an
                unwavering focus on quality — creating profitable
                opportunities for our partners and memorable experiences for
                our customers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ VALUES ═══════════════════ */}
      <section id="values" className="py-20 md:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-5">
          <SectionTitle badge="Core Values" title="What Drives Us" />

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <ValueCard
              icon={Star}
              title="Quality"
              desc="We hold every product, process, and partner interaction to the highest standards of taste, service, and consistency."
            />
            <ValueCard
              icon={Lightbulb}
              title="Innovation"
              desc="We continuously evolve our menu, operations, and brand to stay ahead of what today's Indian consumer wants."
            />
            <ValueCard
              icon={Handshake}
              title="Integrity"
              desc="We build long-term relationships with franchise partners and customers through transparency, honesty, and accountability."
            />
            <ValueCard
              icon={Link2}
              title="Growth"
              desc="We create profitable, scalable opportunities for franchise entrepreneurs while growing a nationwide brand network."
            />
            <ValueCard
              icon={ScrollText}
              title="Compliance"
              desc="We operate with full adherence to regulatory requirements, corporate governance, and ethical business practices."
            />
            <ValueCard
              icon={Sprout}
              title="Responsibility"
              desc="We are committed to sustainable practices and creating positive impact for the communities where our outlets operate."
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════ COMPANY INFO ═══════════════════ */}
      <section id="company-info" className="py-20 md:py-28 bg-gray-50">
        <div className="max-w-4xl mx-auto px-5">
          <SectionTitle
            badge="Verification"
            title="Company Information"
            subtitle="Transparent and verifiable corporate details for your confidence."
          />

          <div className="grid sm:grid-cols-2 gap-4">
            <InfoRow
              icon={Building2}
              label="Company Name"
              value="JKSH United Private Limited"
            />
            <InfoRow
              icon={ScrollText}
              label="Company Type"
              value="Private Limited Company"
            />
            <InfoRow
              icon={Shield}
              label="Registered Under"
              value="Ministry of Corporate Affairs (MCA), India"
            />
            <InfoRow
              icon={ExternalLink}
              label="Country"
              value="India"
            />
            <InfoRow
              icon={MapPin}
              label="Registered Address"
              value="Floor #4, Flat No. #406, Alluri Trade Center, Near KPHB Metro (Pillar #761), Hyderabad, Telangana — 500072"
            />

          </div>
        </div>
      </section>

      {/* ═══════════════════ CONTACT ═══════════════════ */}
      <section id="contact" className="py-20 md:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-5">
          <SectionTitle
            badge="Contact Us"
            title="Get In Touch"
            subtitle="We'd love to hear from you. Reach out via any channel below."
          />

          <div className="grid lg:grid-cols-5 gap-8">
            {/* Info column */}
            <div className="lg:col-span-2 space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[rgb(0,100,55)]/10 flex items-center justify-center shrink-0">
                  <Mail size={18} className="text-[rgb(0,100,55)]" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                    Email
                  </p>
                  <a
                    href="mailto:jkshunitedpvtltd@gmail.com"
                    className="text-gray-800 font-medium text-sm hover:text-[rgb(0,100,55)] transition-colors"
                  >
                    jkshunitedpvtltd@gmail.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[rgb(0,100,55)]/10 flex items-center justify-center shrink-0">
                  <Phone size={18} className="text-[rgb(0,100,55)]" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                    Phone
                  </p>
                  <p className="text-gray-800 font-medium text-sm">
                    +91 93906 58544
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[rgb(0,100,55)]/10 flex items-center justify-center shrink-0">
                  <Building2 size={18} className="text-[rgb(0,100,55)]" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                    Registered Office
                  </p>
                  <p className="text-gray-800 font-medium text-sm">
                    T Vanamm Office, Floor #4, Flat No. #406, Alluri Trade
                    Center, Near KPHB Metro (Pillar #761), Hyderabad,
                    Telangana 500072
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[rgb(0,100,55)]/10 flex items-center justify-center shrink-0">
                  <Clock size={18} className="text-[rgb(0,100,55)]" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                    Business Hours
                  </p>
                  <p className="text-gray-800 font-medium text-sm">
                    Mon – Sat, 10:00 AM – 6:00 PM IST
                  </p>
                </div>
              </div>
            </div>

            {/* Form column */}
            <div className="lg:col-span-3 bg-gray-50 rounded-2xl p-8 border border-gray-100">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.target;
                  const name = form.elements[0].value;
                  const email = form.elements[1].value;
                  const subject = form.elements[2].value;
                  const message = form.elements[3].value;
                  
                  const submitBtn = buttonRef.current;
                  const originalText = submitBtn.innerHTML;
                  
                  try {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = 'Sending...';
                    
                    const { supabase } = await import('../../frontend_supabase/supabaseClient.js');
                    const { data, error } = await supabase.functions.invoke('send-contact-enquiry', {
                      body: { name, email, subject, message }
                    });

                    if (error) throw error;
                    
                    form.reset();
                    submitBtn.innerHTML = '<span class="text-green-500 flex items-center gap-2">✓ Message Sent!</span>';
                    setTimeout(() => {
                      submitBtn.disabled = false;
                      submitBtn.innerHTML = originalText;
                    }, 3000);
                    
                  } catch (err) {
                    console.error("Error sending message:", err);
                    alert("Failed to send message. Please try again or email us directly at jkshunitedpvtltd@gmail.com");
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                  }
                }}
                className="space-y-5"
              >
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      Name
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(0,100,55)] focus:border-transparent transition bg-white"
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(0,100,55)] focus:border-transparent transition bg-white"
                      placeholder="you@email.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Subject
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(0,100,55)] focus:border-transparent transition bg-white"
                    placeholder="Subject"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Message
                  </label>
                  <textarea
                    rows={4}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(0,100,55)] focus:border-transparent transition resize-none bg-white"
                    placeholder="How can we help you?"
                  />
                </div>
                <button
                  type="submit"
                  ref={buttonRef}
                  className="w-full sm:w-auto bg-[rgb(0,100,55)] text-white font-bold px-8 py-3 rounded-lg hover:bg-[rgb(0,80,45)] transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-75"
                >
                  <Send size={16} /> Submit Enquiry
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ FOOTER ═══════════════════ */}
      <footer
        style={{
          background: `linear-gradient(135deg, ${PRIMARY_DARK} 0%, rgb(0,50,30) 100%)`,
        }}
      >
        <div className="max-w-7xl mx-auto px-5 py-14">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
            {/* Brand */}
            <div className="text-center md:text-left">
              <div className="flex items-center gap-3 justify-center md:justify-start">
                <img
                  src="/logo.jpg"
                  alt="JKSH United"
                  className="h-12 w-12 rounded-full object-cover border-2 border-white/20"
                />
                <div>
                  <p className="text-white font-extrabold text-lg">
                    JKSH United Private Limited
                  </p>
                  <p className="text-white/50 text-xs">
                    United by vision, driven by excellence
                  </p>
                </div>
              </div>
            </div>

            {/* Links */}
            <div className="flex flex-wrap gap-6 justify-center">
              {NAV_LINKS.map((l) => (
                <button
                  key={l.href}
                  onClick={() => scrollTo(l.href)}
                  className="text-white/60 text-sm hover:text-white transition-colors"
                >
                  {l.label}
                </button>
              ))}
              <button
                onClick={() => navigate("/login")}
                className="text-white/60 text-sm hover:text-white transition-colors font-semibold"
              >
                Login
              </button>
            </div>
          </div>

          <hr className="border-white/10 my-8" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/40">
            <p>
              © {new Date().getFullYear()} JKSH United Private Limited. All
              rights reserved.
            </p>
            <p>Registered under MCA, Government of India</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 mt-6 text-xs text-white/30">
            <span className="hover:text-white/60 cursor-pointer transition-colors">
              Privacy Policy
            </span>
            <span className="hover:text-white/60 cursor-pointer transition-colors">
              Terms of Use
            </span>
            <a
              href="https://wa.me/919390658544"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 px-3 py-1.5 rounded-full transition-colors text-xs font-semibold"
            >
              💬 Chat with us on WhatsApp
            </a>
          </div>
        </div>
      </footer>

      {/* ═══════════════════ SCROLL TO TOP ═══════════════════ */}
      {showTopBtn && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-[rgb(0,100,55)] text-white shadow-lg flex items-center justify-center hover:bg-[rgb(0,80,45)] transition-all hover:scale-110"
          aria-label="Scroll to top"
        >
          <ArrowUp size={20} />
        </button>
      )}
    </div>
  );
};

export default StaticPage;
