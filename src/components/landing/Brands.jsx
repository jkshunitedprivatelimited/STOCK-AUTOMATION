import React from "react";
import { ExternalLink } from "lucide-react";

const Brands = () => {
  return (
    <section id="our-brands" className="py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-16 animate-on-scroll">
          <div className="inline-block mb-4 border border-emerald-200 bg-emerald-50 px-3 py-1 rounded-full text-emerald-700 font-semibold text-sm tracking-widest uppercase">
            Our Brands
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Under the JKSH Umbrella
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Discover our premium brands dedicated to bringing you the finest quality tea products, deeply rooted in tradition and crafted for excellence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
          
          {/* T Vanamm Brand Card */}
          <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100 shadow-md hover:shadow-xl transition-shadow duration-300 flex flex-col items-center text-center group animate-on-scroll">
            <div className="bg-white p-6 rounded-2xl w-48 h-48 flex items-center justify-center mb-6 shadow-sm border border-gray-50 group-hover:scale-105 transition-transform duration-300">
              <img 
                src="/t_vanamm_logo.png" 
                alt="T Vanamm Logo" 
                className="max-w-full max-h-full object-contain"
                onError={(e) => { e.target.src = '/vite.svg'; e.target.alt = 'Logo missing' }}
              />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">T Vanamm</h3>
            <span className="text-sm font-bold text-emerald-600 tracking-widest uppercase mb-1">Flagship Brand</span>
            <span className="text-md font-semibold text-gray-700 mb-4">India's Modern Tea Café</span>
            <p className="text-gray-600 mb-6 flex-grow">
              A modern tea café concept operating across 150+ franchise locations in India. Offering 120+ beverages including flavored teas, milk teas, herbal teas, iced teas, specialty drinks, and café-style quick bites.
            </p>
            
            <div className="flex gap-4 mb-8 w-full justify-center">
              <div className="bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm w-32">
                <span className="block font-bold text-emerald-600 text-2xl mb-1">150+</span>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Outlets</span>
              </div>
              <div className="bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm w-32">
                <span className="block font-bold text-emerald-600 text-2xl mb-1">120+</span>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Beverages</span>
              </div>
            </div>

            <a href="https://tvanamm.com/" target="_blank" rel="noopener noreferrer" className="mt-auto inline-flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-600 hover:text-white transition-all duration-300">
              Explore T Vanamm <ExternalLink size={18} />
            </a>
          </div>

          {/* T Leaf Brand Card */}
          <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100 shadow-md hover:shadow-xl transition-shadow duration-300 flex flex-col items-center text-center group animate-on-scroll" style={{ transitionDelay: '100ms' }}>
            <div className="bg-white p-6 rounded-2xl w-48 h-48 flex items-center justify-center mb-6 shadow-sm border border-gray-50 group-hover:scale-105 transition-transform duration-300">
              <img 
                src="/t_leaf_logo.png" 
                alt="T Leaf Logo" 
                className="max-w-full max-h-full object-contain"
                onError={(e) => { e.target.src = '/vite.svg'; e.target.alt = 'Logo missing' }}
              />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">T Leaf</h3>
            <span className="text-sm font-bold text-emerald-600 tracking-widest uppercase mb-4">Premium Indian Tea Brand</span>
            <p className="text-gray-600 mb-6 flex-grow">
              A premium tea brand delivering authentic Indian tea experiences. Focused on sourcing the finest tea leaves and creating signature blends that celebrate India's rich tea heritage with a modern, quality-first approach.
            </p>

            <div className="flex gap-4 mb-8 w-full justify-center">
              <div className="bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm flex items-center justify-center h-[76px] w-32">
                <span className="text-xs text-gray-700 uppercase tracking-widest font-bold text-center">Premium<br/>Blends</span>
              </div>
              <div className="bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm flex items-center justify-center h-[76px] w-32">
                <span className="text-xs text-gray-700 uppercase tracking-widest font-bold text-center">Signature<br/>Teas</span>
              </div>
            </div>

            <a href="https://signifysoft.com/Tleaf/index.html" target="_blank" rel="noopener noreferrer" className="mt-auto inline-flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-600 hover:text-white transition-all duration-300">
              Explore T Leaf <ExternalLink size={18} />
            </a>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Brands;
