import React, { useState, useEffect } from "react";
import Navbar from "../../components/landing/Navbar";
import Footer from "../../components/landing/Footer";
import { Link } from "react-router-dom";

const Careers = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [formData, setFormData] = useState({ name: "", email: "", role: "", message: "" });
  const [status, setStatus] = useState("idle");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    
    try {
      const isDev = import.meta.env.DEV;
      const endpoint = isDev ? '/api/resend/emails' : '/api/contact';
      const headers = { 'Content-Type': 'application/json' };
      
      let payload;
      if (isDev) {
        // Using dedicated contact key
        headers['Authorization'] = `Bearer ${import.meta.env.VITE_RESEND_CONTACT_API_KEY || import.meta.env.VITE_RESEND_API_KEY}`;
        payload = {
          from: 'JKSH Website <onboarding@resend.dev>',
          to: ['jkshunitedpvtltd@gmail.com'], // Resend sandbox restriction
          subject: `Career Application: ${formData.role || "General Application"}`,
          html: `
            <h3>New Career Form Submission</h3>
            <p><strong>Name:</strong> ${formData.name}</p>
            <p><strong>Email:</strong> ${formData.email}</p>
            <p><strong>Applying for:</strong> ${formData.role}</p>
            <p><strong>Message/Cover Letter:</strong><br/>${formData.message}</p>
          `
        };
      } else {
        payload = {
          name: formData.name,
          email: formData.email,
          subject: `Career Application: ${formData.role || "General Application"}`,
          message: `Applying for: ${formData.role}\n\n${formData.message}`
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const responseData = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to send email');
      }

      setStatus("success");
      setFormData({ name: "", email: "", role: "", message: "" });
      setTimeout(() => setStatus("idle"), 4000);
    } catch (error) {
      console.error("Email Error:", error);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 4000);
    }
  };

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
            We are always looking for passionate individuals to join our growing family. You can submit your details in the form below, or share your resume and a brief cover letter explaining your interest to <strong>jkshunitedpvtltd@gmail.com</strong>.
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

          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] border border-gray-100 text-left mt-10">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Submit Your Application</h3>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors outline-none"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors outline-none"
                  placeholder="name@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role / Position</label>
                <input
                  type="text"
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors outline-none"
                  placeholder="e.g. Area Manager, Store Staff, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cover Letter / Message</label>
                <textarea
                  rows="4"
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors outline-none resize-none"
                  placeholder="Tell us why you are a great fit..."
                ></textarea>
              </div>
              <button
                type="submit"
                disabled={status === "loading"}
                className={`w-full font-bold py-4 rounded-lg transition-colors shadow-lg transform hover:-translate-y-0.5 duration-200 ${
                  status === "success" ? "bg-green-500 text-white shadow-green-500/30" :
                  status === "error" ? "bg-red-500 text-white shadow-red-500/30" :
                  "bg-gray-900 text-white hover:bg-gray-800 shadow-gray-900/30"
                }`}
              >
                {status === "loading" ? "Submitting..." :
                 status === "success" ? "Application Submitted!" :
                 status === "error" ? "Error Submitting (Try Again)" :
                 "Submit Application"}
              </button>
            </form>
          </div>

          <Link
            to="/"
            className="inline-flex items-center justify-center px-8 py-3.5 text-lg font-bold rounded-full bg-white text-gray-800 border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 w-full sm:w-auto mt-10"
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

