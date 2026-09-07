// Tijdelijke shell. De schermen (Overzicht, Nieuwe verbouwing, Planning, Mail verwerken, Beheer)
// komen in fase 5 t/m 9 van BUILDPLAN.md. De rekenkern (domain/) staat en is getest.

function App() {
  return (
    <main style={{ maxWidth: 640, margin: '48px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: 22 }}>Verbouwmonitor</h1>
      <p style={{ color: 'var(--text-muted)' }}>
        Rekenkern (datamodel, werkdagen, Laag 1 &amp; 2) staat en is getest. De schermen volgen in de
        volgende fasen — zie BUILDPLAN.md.
      </p>
    </main>
  )
}

export default App
