import React from "react";
import { CheckCircle2, ShieldCheck, MapPin } from "lucide-react";

const About = () => {
  return (
    <section id="about-intro" className="relative overflow-hidden">
      {/* Top half — white content */}
      <div className="py-24 bg-white relative z-10">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-green-50 rounded-full blur-3xl opacity-40 -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Text Content */}
            <div className="order-2 lg:order-1 animate-on-scroll">
              <div className="inline-block mb-4 border border-green-200 bg-green-50 px-3 py-1 rounded-full text-green-700 font-semibold text-sm tracking-widest uppercase">
                Who We Are
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                About JKSH United
              </h2>
              
              <div className="space-y-5 text-gray-600 text-lg leading-relaxed">
                <p>
                  <strong className="text-gray-900 font-semibold">JKSH United Private Limited</strong> is a professionally managed Indian Private Limited company focused on building and scaling consumer-facing brands. Our flagship brand, <strong className="text-green-700">T Vanamm</strong>, is a modern tea café concept operating across 250+ franchise locations in India.
                </p>
                <p>
                  We operate with a strong commitment to quality, innovation, and franchise excellence — empowering entrepreneurs to build profitable businesses under a trusted brand identity.
                </p>
                <p>
                  From brand development to franchise operations, store design, and business support, JKSH United provides end-to-end infrastructure that enables our brands and partners to grow together.
                </p>
              </div>

              {/* Quick Stats */}
              <div className="mt-10 grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: "Company Type", value: "Pvt. Ltd.", icon: null },
                  { label: "MCA Registered", value: null, icon: <ShieldCheck className="text-green-600" size={22} /> },
                  { label: "India Origin", value: null, icon: <MapPin className="text-green-600" size={22} /> },
                ].map((stat, i) => (
                  <div key={i} className="flex flex-col p-4 bg-gray-50 rounded-xl border border-gray-100 items-center text-center hover:bg-green-50 transition-colors duration-300 group cursor-default">
                    {stat.value ? (
                      <span className="text-green-700 font-bold text-lg mb-1 group-hover:scale-110 transition-transform duration-300">{stat.value}</span>
                    ) : (
                      <span className="mb-1 group-hover:scale-110 transition-transform duration-300">{stat.icon}</span>
                    )}
                    <span className="text-xs text-gray-500 uppercase tracking-wide">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Image Grid */}
            <div className="order-1 lg:order-2 relative animate-on-scroll">
              <div className="grid grid-cols-2 gap-4">
                <img 
                  src="/woman-picking-tea-leaves-by-hand-green-tea-farm.jpg" 
                  alt="Woman Picking Tea Leaves" 
                  className="rounded-2xl w-full h-72 md:h-80 object-cover shadow-xl translate-y-6 ring-4 ring-white hover:shadow-2xl transition-shadow duration-500"
                  loading="lazy"
                  decoding="async"
                />
                <img 
                  src="/tea-pickers-working-kerela-india.jpg" 
                  alt="Tea Pickers Kerala" 
                  className="rounded-2xl w-full h-72 md:h-80 object-cover shadow-xl ring-4 ring-white hover:shadow-2xl transition-shadow duration-500"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              {/* Floating accent */}
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-green-100 rounded-full blur-2xl opacity-60 pointer-events-none"></div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
