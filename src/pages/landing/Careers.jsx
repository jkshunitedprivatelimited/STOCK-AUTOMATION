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
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            We are always looking for passionate individuals to join our growing family. To apply, please share your resume and a brief cover letter explaining your interest to <strong>jkshunitedpvtltd@gmail.com</strong>.
            Our team will review your application closely and get back to you with the next steps of our interview process.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mb-10 w-full">
            <a
              href="mailto:jkshunitedpvtltd@gmail.com"
              className="inline-flex items-center justify-center gap-3 px-8 py-3.5 text-lg font-bold rounded-full bg-gray-900 text-white hover:bg-gray-800 transition-all duration-300 shadow-lg w-full sm:w-auto"
            >
              <img src="/E-Mail.png" alt="Email" className="w-6 h-6 object-contain" /> Email Application
            </a>
            <a
              href="https://wa.me/919390658544"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-3 px-8 py-3.5 text-lg font-bold rounded-full bg-green-600 text-white hover:bg-green-500 transition-all duration-300 shadow-lg w-full sm:w-auto"
            >
              <img src="/Whatsapp-logo.png" alt="WhatsApp" className="w-6 h-6 object-contain" /> Chat on WhatsApp
            </a>
          </div>

          <Link
            to="/"
            className="inline-flex items-center justify-center px-8 py-3.5 text-lg font-bold rounded-full bg-white text-gray-800 border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 w-full sm:w-auto mt-4"
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
