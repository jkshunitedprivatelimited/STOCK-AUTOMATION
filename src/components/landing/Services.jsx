import React from "react";
import { Store, Coffee, CupSoda, Megaphone, CheckSquare, TrendingUp } from "lucide-react";

const servicesList = [
  {
    icon: <Store size={32} className="text-green-600" />,
    title: "Franchise Development",
    description: "End-to-end franchise setup support including store design, interiors, and brand deployment for T Vanamm outlets across India.",
    emoji: "📦"
  },
  {
    icon: <CheckSquare size={32} className="text-green-600" />,
    title: "Menu & Product Training",
    description: "Comprehensive training on all 120+ beverages and food items to ensure consistent taste and quality at every franchise outlet.",
    emoji: "💼"
  },
  {
    icon: <CupSoda size={32} className="text-green-600" />,
    title: "Tea & Café Products",
    description: "A curated menu of 120+ beverages including flavored teas, milk teas, herbal teas, iced teas, specialty drinks, and café-style quick bites.",
    emoji: "🍵"
  },
  {
    icon: <Megaphone size={32} className="text-green-600" />,
    title: "Brand & Marketing Support",
    description: "Ready-to-use marketing assets, branding templates, and campaign support to help franchise partners drive local customer engagement.",
    emoji: "📈"
  },
  {
    icon: <Coffee size={32} className="text-green-600" />,
    title: "Operations & Compliance",
    description: "Detailed SOPs, operational manuals, and ongoing guidance to help franchise partners run smooth, standardized outlets.",
    emoji: "🏗️"
  },
  {
    icon: <TrendingUp size={32} className="text-green-600" />,
    title: "Business Growth Support",
    description: "Dedicated franchise support team assisting partners from onboarding through day-to-day operations and long-term business growth.",
    emoji: "📋"
  }
];

const Services = () => {
  return (
    <section id="services" className="py-24 bg-slate-50 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 animate-on-scroll">
          <div className="inline-block mb-4 border border-green-200 bg-white px-3 py-1 rounded-full text-green-700 font-semibold text-sm tracking-widest uppercase shadow-sm">
            What We Do
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Our Services
          </h2>
          <p className="text-lg text-gray-600">
            We deliver professional services across multiple sectors with a commitment to quality, transparency, and results.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {servicesList.map((service, index) => (
            <div 
              key={index}
              className="group bg-white rounded-2xl p-8 border border-gray-100 hover:border-green-100 hover:shadow-xl transition-all duration-300 animate-on-scroll"
            >
              <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                {service.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                {service.title} <span className="text-2xl" aria-hidden="true">{service.emoji}</span>
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {service.description}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default Services;
