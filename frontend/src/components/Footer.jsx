export default function Footer() {
  return (
    <footer className="border-t border-border mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-muted text-center sm:text-left">
          NammaRoute AI — an AI-powered Bengaluru Metro navigation platform.
          Route and journey time calculations are estimates. Always verify with{' '}
          <a
            href="https://english.bmrc.co.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-ink"
          >
            official BMRCL channels
          </a>{' '}
          for critical travel decisions. Not an official BMRCL service.
        </p>
        <p className="text-xs text-muted shrink-0">NammaRoute AI · Portfolio Project</p>
      </div>
    </footer>
  )
}
