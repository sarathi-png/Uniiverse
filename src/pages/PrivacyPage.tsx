import { useEffect } from "react";
import { motion } from "framer-motion";

export default function PrivacyPage() {
  useEffect(() => { document.title = "Privacy Policy — NOVASTREAM"; }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto min-h-screen max-w-3xl px-4 pb-24 pt-24 sm:px-6 lg:px-8"
    >
      <h1 className="mb-8 text-3xl font-bold text-white">Privacy Policy</h1>

      <div className="space-y-6 text-sm leading-relaxed text-white/60">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">Information We Collect</h2>
          <p>
            NOVASTREAM does not collect, store, or process any personal information on our servers.
            All user data — including watch history, bookmarks, and preferences — is stored locally
            in your browser using localStorage. This data never leaves your device.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">Third-Party Services</h2>
          <p>
            Our service retrieves content from third-party file hosting services via direct links.
            These providers may set their own cookies or collect data in accordance with their own
            privacy policies. We do not control and are not responsible for the data practices of
            these third parties.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">Cookies</h2>
          <p>
            We use only strictly necessary local storage for app functionality. We do not use tracking
            cookies, analytics, or advertising cookies.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">Data Security</h2>
          <p>
            Since all personal data is stored locally in your browser, there is no data at risk on our
            servers. We recommend clearing your browser data periodically if you use shared devices.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">Contact</h2>
          <p>
            If you have questions about this privacy policy, contact us at privacy@novastream.app.
          </p>
        </section>
      </div>
    </motion.div>
  );
}
