import { useEffect } from "react";
import { motion } from "framer-motion";

export default function TermsPage() {
  useEffect(() => { document.title = "Terms of Service — NOVASTREAM"; }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto min-h-screen max-w-3xl px-4 pb-24 pt-24 sm:px-6 lg:px-8"
    >
      <h1 className="mb-8 text-3xl font-bold text-white">Terms of Service</h1>

      <div className="space-y-6 text-sm leading-relaxed text-white/60">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">Acceptance of Terms</h2>
          <p>
            By accessing or using NOVASTREAM, you agree to be bound by these terms. If you do not
            agree, do not use the service.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">Service Description</h2>
          <p>
            NOVASTREAM is a media discovery and aggregation platform. We provide links to content
            hosted by third-party streaming providers. We do not host, upload, or distribute any
            copyrighted content.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">User Responsibilities</h2>
          <ul className="mt-2 space-y-1 pl-5 list-disc">
            <li>You must be at least 13 years of age to use this service.</li>
            <li>You agree not to use the service for any unlawful purpose.</li>
            <li>You agree not to attempt to bypass any content restrictions.</li>
            <li>You are responsible for your internet usage and any applicable data charges.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">Disclaimer of Warranties</h2>
          <p>
            This service is provided "as is" without warranties of any kind. We do not guarantee
            uninterrupted or error-free service. Third-party streaming providers may change or remove
            content at any time without notice.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">Limitation of Liability</h2>
          <p>
            NOVASTREAM shall not be liable for any damages arising from the use or inability to use
            this service, including but not limited to direct, indirect, incidental, or consequential
            damages.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. Continued use of the service after
            changes constitutes acceptance of the new terms.
          </p>
        </section>
      </div>
    </motion.div>
  );
}
