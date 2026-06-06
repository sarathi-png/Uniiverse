import { useEffect } from "react";
import { motion } from "framer-motion";

export default function DMCAPage() {
  useEffect(() => { document.title = "DMCA Notice — NOVASTREAM"; }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto min-h-screen max-w-3xl px-4 pb-24 pt-24 sm:px-6 lg:px-8"
    >
      <h1 className="mb-8 text-3xl font-bold text-white">DMCA Copyright Notice</h1>

      <div className="space-y-6 text-sm leading-relaxed text-white/60">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">Our Policy</h2>
          <p>
            NOVASTREAM respects the intellectual property rights of others. In accordance with the
            Digital Millennium Copyright Act (DMCA), we will respond expeditiously to claims of
            copyright infringement.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">Important Notice</h2>
          <p>
            NOVASTREAM does not host, store, or upload any video content. All video content displayed
            on this platform is sourced from third-party file hosting services via direct links.
            We act as a search and aggregation service, linking to content hosted by external servers.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">Filing a DMCA Takedown Request</h2>
          <p>Please provide the following information:</p>
          <ol className="mt-2 space-y-2 pl-5 list-decimal">
            <li>Your full name, address, telephone number, and email address.</li>
            <li>A description of the copyrighted work you claim has been infringed.</li>
            <li>The exact URL(s) on NOVASTREAM where the allegedly infringing content appears.</li>
            <li>A statement that you have a good faith belief that the use is not authorized.</li>
            <li>A statement, made under penalty of perjury, that the information is accurate.</li>
            <li>Your physical or electronic signature.</li>
          </ol>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">Designated Agent</h2>
          <div className="glass rounded-xl p-4 space-y-1">
            <p><strong className="text-white/70">Email:</strong> dmca@novastream.app</p>
            <p className="text-[11px] text-white/30">(For demo purposes — replace with a real email in production)</p>
          </div>
        </section>

        <p className="border-t border-white/5 pt-4 text-xs text-white/20">
          This is a template for demonstration purposes. Consult with a legal professional for compliance.
        </p>
      </div>
    </motion.div>
  );
}
