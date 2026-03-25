import React from "react";
import { Telescope, Target } from "lucide-react";

const VisionMission = () => {
  return (
    <section id="vision" className="relative py-28 overflow-hidden">
      {/* Full background image — woman picking tea */}
      <div className="absolute inset-0 w-full h-full">
        <img
          src="/woman-picking-tea-leaves-by-hand-green-tea-farm.jpg"
          alt="Tea Farm Background"
          className="w-full h-full object-cover object-center"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-green-950/85"></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16 animate-on-scroll">
          <div className="inline-block mb-4 border border-green-400/30 bg-green-900/40 backdrop-blur-sm px-4 py-1.5 rounded-full text-green-300 font-semibold text-sm tracking-widest uppercase">
            Our Purpose
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">Vision & Mission</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Vision */}
          <div className="bg-white/5 backdrop-blur-md rounded-3xl p-10 border border-white/10 hover:bg-white/10 transition-colors duration-500 shadow-2xl animate-on-scroll group">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-green-600 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Telescope size={28} className="text-white" />
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-white">
                Our Vision
              </h3>
            </div>
            <p className="text-green-50/85 text-lg leading-relaxed font-light">
              To become one of India's most respected consumer brand companies — building businesses that redefine everyday experiences, empower entrepreneurs, and create value for millions of customers across the country.
            </p>
          </div>

          {/* Mission */}
          <div className="bg-white/5 backdrop-blur-md rounded-3xl p-10 border border-white/10 hover:bg-white/10 transition-colors duration-500 shadow-2xl animate-on-scroll group">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-green-600 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Target size={28} className="text-white" />
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-white">
                Our Mission
              </h3>
            </div>
            <p className="text-green-50/85 text-lg leading-relaxed font-light">
              To develop, launch, and scale consumer-facing brands through proven franchise models, operational excellence, and an unwavering focus on quality — creating profitable opportunities for our partners and memorable experiences for our customers.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VisionMission;
