import React, { useEffect } from "react";
import Navbar from "../../components/landing/Navbar";
import Hero from "../../components/landing/Hero";
import About from "../../components/landing/About";
import Services from "../../components/landing/Services";
import VisionMission from "../../components/landing/VisionMission";
import Values from "../../components/landing/Values";
import CompanyInfo from "../../components/landing/CompanyInfo";
import Brands from "../../components/landing/Brands";
import Contact from "../../components/landing/Contact";
import LegalPolicies from "../../components/landing/LegalPolicies";
import Footer from "../../components/landing/Footer";
import ImageDivider from "../../components/landing/ImageDivider";

const LandingPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = "1";
            entry.target.style.transform = "translateY(0)";
            observer.unobserve(entry.target);
          }
        });
      },
      { root: null, rootMargin: "0px 0px -60px 0px", threshold: 0.08 }
    );

    const els = document.querySelectorAll(".animate-on-scroll");
    els.forEach((el) => {
      // Set initial state via inline styles for GPU acceleration
      el.style.opacity = "0";
      el.style.transform = "translateY(32px)";
      el.style.transition = "opacity 0.9s cubic-bezier(0.22,1,0.36,1), transform 0.9s cubic-bezier(0.22,1,0.36,1)";
      el.style.willChange = "opacity, transform";
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="font-sans antialiased text-gray-900 bg-white selection:bg-green-100 selection:text-green-900 overflow-x-hidden scroll-smooth">
      <Navbar />
      <Hero />
      
      <div id="about" className="scroll-mt-20">
        <About />
        <VisionMission />
        <Values />
        <CompanyInfo />
      </div>

      {/* Cinematic Image Divider — Herbal Tea */}
      <ImageDivider
        src="/herbal tea -2.jpeg"
        alt="Herbal Tea Experience"
        quote="Experience the pure essence of nature in every cup."
      />

      <Services />

      {/* Cinematic Image Divider — Herbal Tea Cup */}
      <ImageDivider
        src="/herbal tea.png"
        alt="Premium Herbal Tea"
        quote="Brewed for health, crafted for soul."
      />

      <Brands />
      <Contact />
      <LegalPolicies />
      <Footer />
    </div>
  );
};

export default LandingPage;
