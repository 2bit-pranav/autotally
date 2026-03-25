// 1. store all the uploaded files
// 2. run ocr through them and store text data 
// 3. send the text array to the backend

import FileIngestion from './components/FileIngestion'

function App() {
  return (
    <div style={{ background: '#121212', padding: '40px' }}>
      <FileIngestion onAnalyze={(data) => console.log('Analyzed Data:', data)} />
    </div>
  )
}

export default App
