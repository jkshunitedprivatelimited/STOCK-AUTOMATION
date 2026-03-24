import React from "react";
import { ArrowRight } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
      {/* Background Image — tea pickers */}
      <div className="absolute inset-0 w-full h-full">
        <img
          src="/tea-estate.jpg"
          alt="Tea Pickers Working in Kerala"
          className="w-full h-full object-cover object-center scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-green-950/95 via-green-950/70 to-green-900/40"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-16 sm:pt-0">
        <div className="max-w-3xl" style={{ animation: "heroFadeIn 1.2s cubic-bezier(0.22,1,0.36,1) forwards" }}>
          
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-white leading-[1.1] sm:leading-[1.1] md:leading-[1.1] mb-4 sm:mb-6 tracking-tight">
            JKSH United<br className="hidden sm:block" />
            <span className="text-green-300"> Private Limited</span>
          </h1>
          
          <p className="text-lg sm:text-lg md:text-2xl text-white/85 mb-3 sm:mb-4 font-light leading-relaxed max-w-2xl">
            United by vision, driven by excellence.
          </p>
          <p className="text-sm sm:text-base md:text-lg text-white/80 mb-8 sm:mb-10 leading-relaxed max-w-2xl">
            A growth-oriented consumer brand company building scalable, experience-driven businesses across India.
            Home to <strong className="text-white font-semibold">T Vanamm</strong> — India's modern tea café brand with 150+ franchise outlets nationwide.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full">
            <a
              href="#about"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 sm:px-8 py-3.5 sm:py-4 text-base sm:text-lg font-bold rounded-full bg-green-600 text-white hover:bg-green-500 transition-colors duration-300 shadow-lg shadow-green-600/30"
            >
              Explore Company
            </a>
            <a
              href="#contact"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 sm:px-8 py-3.5 sm:py-4 text-base sm:text-lg font-bold rounded-full bg-white/10 text-white border border-white/30 backdrop-blur-md hover:bg-white/20 transition-colors duration-300 group"
            >
              Contact Us <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={18} />
            </a>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-70">
        <span className="text-white text-xs mb-2 tracking-[0.3em] uppercase font-medium">Scroll</span>
        <div className="w-5 h-9 rounded-full border-2 border-white/50 flex items-start justify-center p-1.5">
          <div className="w-1 h-2 bg-white rounded-full animate-bounce"></div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes heroFadeIn {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </section>
  );
};

export default Hero;
