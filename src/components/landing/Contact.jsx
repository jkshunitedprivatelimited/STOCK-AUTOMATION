import React, { useState } from "react";
import { Mail, Phone, MapPin, Clock } from "lucide-react";

const Contact = () => {
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState("idle");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${import.meta.env.VITE_RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "JKSH Website <onboarding@resend.dev>",
          to: ["jkshunitedpvtltd@gmail.com"],
          subject: `Enquiry: ${formData.subject || "Website Contact"}`,
          html: `
            <h3>New Contact Form Submission</h3>
            <p><strong>Name:</strong> ${formData.name}</p>
            <p><strong>Email:</strong> ${formData.email}</p>
            <p><strong>Subject:</strong> ${formData.subject}</p>
            <p><strong>Message:</strong><br/>${formData.message}</p>
          `
        })
      });

      if (response.ok) {
        setStatus("success");
        setFormData({ name: "", email: "", subject: "", message: "" });
        setTimeout(() => setStatus("idle"), 4000);
      } else {
        setStatus("error");
        setTimeout(() => setStatus("idle"), 4000);
      }
    } catch (error) {
      console.error("Email Error:", error);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 4000);
    }
  };

  return (
    <section id="contact" className="py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-16 animate-on-scroll">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Contact Us</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Ready to explore franchise opportunities or have a general inquiry? Reach out to our team.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">

          {/* Contact Details */}
          <div className="space-y-8 animate-on-scroll">
            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100 flex items-start gap-6 hover:shadow-md hover:-translate-y-1 transition-all group cursor-default">
              <div className="bg-white p-4 rounded-full shadow-sm group-hover:bg-green-50 transition-colors">
                <Mail className="text-green-600" size={28} />
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-900 mb-1">Email</h4>
                <a href="mailto:jkshunitedpvtltd@gmail.com" className="text-green-600 hover:text-green-800 text-lg font-medium transition-colors break-all">jkshunitedpvtltd@gmail.com</a>
              </div>
            </div>

            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100 flex items-start gap-6 hover:shadow-md hover:-translate-y-1 transition-all group cursor-default">
              <div className="bg-white p-4 rounded-full shadow-sm group-hover:bg-green-50 transition-colors">
                <Phone className="text-green-600" size={28} />
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-900 mb-1">Phone</h4>
                <a href="tel:+919390658544" className="text-gray-700 text-lg hover:text-green-600 transition-colors">+91 93906 58544</a>
              </div>
            </div>

            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100 flex items-start gap-6 hover:shadow-md hover:-translate-y-1 transition-all group cursor-default">
              <div className="bg-white p-4 rounded-full shadow-sm group-hover:bg-green-50 transition-colors">
                <MapPin className="text-green-600" size={28} />
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-900 mb-1">Registered Office</h4>
                <p className="text-gray-700 leading-relaxed group-hover:text-gray-900 transition-colors">
                  T Vanamm Office, Floor #4, Flat No. #406,<br />
                  Alluri Trade Center, Near KPHB Metro (Pillar #761),<br />
                  Hyderabad, Telangana 500072
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100 flex items-start gap-6 hover:shadow-md hover:-translate-y-1 transition-all group cursor-default">
              <div className="bg-white p-4 rounded-full shadow-sm group-hover:bg-green-50 transition-colors">
                <Clock className="text-green-600" size={28} />
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-900 mb-1">Business Hours</h4>
                <p className="text-gray-700 group-hover:text-gray-900 transition-colors">Mon – Sat, 10:00 AM – 6:00 PM IST</p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] border border-gray-100 animate-on-scroll">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Send us a message</h3>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors outline-none"
                  placeholder="How can we help?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <textarea
                  rows="4"
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors outline-none resize-none"
                  placeholder="Write your message here..."
                ></textarea>
              </div>
              <button
                type="submit"
                disabled={status === "loading"}
                className={`w-full font-bold py-4 rounded-lg transition-colors shadow-lg transform hover:-translate-y-0.5 duration-200 ${
                  status === "success" ? "bg-green-500 text-white shadow-green-500/30" :
                  status === "error" ? "bg-red-500 text-white shadow-red-500/30" :
                  "bg-green-600 text-white hover:bg-green-700 shadow-green-600/30"
                }`}
              >
                {status === "loading" ? "Sending..." :
                 status === "success" ? "Message Sent!" :
                 status === "error" ? "Error Sending (Try Again)" :
                 "Submit Enquiry"}
              </button>
            </form>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Contact;
