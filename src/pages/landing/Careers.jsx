import React, { useEffect } from "react";
import Navbar from "../../components/landing/Navbar";
import Footer from "../../components/landing/Footer";
import { Link } from "react-router-dom";

const Careers = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="font-sans antialiased text-gray-900 bg-slate-50 min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow pt-32 pb-24 flex items-center justify-center">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="inline-block mb-4 border border-green-200 bg-white px-4 py-1.5 rounded-full text-green-700 font-semibold text-sm tracking-widest uppercase shadow-sm">
            Join Our Team
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 font-display tracking-tight">
            Careers at JKSH United
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            We are always looking for passionate individuals to join our growing family. Opportunities coming soon.
          </p>
          <Link 
            to="/" 
            className="inline-flex items-center justify-center px-8 py-3.5 text-lg font-bold rounded-full bg-green-600 text-white hover:bg-green-700 transition-all duration-300 shadow-lg hover:shadow-green-600/30 w-full sm:w-auto"
          >
            Return Home
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Careers;
