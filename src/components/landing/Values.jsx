import React from "react";
import { Star, Lightbulb, Handshake, TrendingUp, ShieldCheck, Leaf } from "lucide-react";

const values = [
  {
    icon: <Star size={28} className="text-yellow-500" />,
    title: "Quality",
    description: "We hold every product, process, and partner interaction to the highest standards of taste, service, and consistency.",
    emoji: "⭐"
  },
  {
    icon: <Lightbulb size={28} className="text-blue-500" />,
    title: "Innovation",
    description: "We continuously evolve our menu, operations, and brand to stay ahead of what today's Indian consumer wants.",
    emoji: "💡"
  },
  {
    icon: <Handshake size={28} className="text-indigo-500" />,
    title: "Integrity",
    description: "We build long-term relationships with franchise partners and customers through transparency, honesty, and accountability.",
    emoji: "🤝"
  },
  {
    icon: <TrendingUp size={28} className="text-green-500" />,
    title: "Growth",
    description: "We create profitable, scalable opportunities for franchise entrepreneurs while growing a nationwide brand network.",
    emoji: "🔗"
  },
  {
    icon: <ShieldCheck size={28} className="text-red-500" />,
    title: "Compliance",
    description: "We operate with full adherence to regulatory requirements, corporate governance, and ethical business practices.",
    emoji: "📜"
  },
  {
    icon: <Leaf size={28} className="text-emerald-500" />,
    title: "Responsibility",
    description: "We are committed to sustainable practices and creating positive impact for the communities where our outlets operate.",
    emoji: "🌱"
  }
];

const Values = () => {
  return (
    <section id="values" className="py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-16 animate-on-scroll">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Core Values</h2>
          <div className="w-24 h-1 bg-green-600 mx-auto rounded-full"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {values.map((val, index) => (
            <div 
              key={index} 
              className="flex flex-col items-center text-center p-8 bg-gray-50 rounded-2xl hover:bg-green-50 transition-colors duration-300 border border-gray-100 group animate-on-scroll shadow-sm hover:shadow-lg"
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="w-16 h-16 bg-white rounded-full shadow-md flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                {val.icon}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                {val.title} <span className="text-xl" aria-hidden="true">{val.emoji}</span>
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {val.description}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default Values;
