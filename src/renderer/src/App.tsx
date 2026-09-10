import electronLogo from './assets/electron.svg'
import { Button } from './components/ui/button'
import { useEffect, useState } from 'react';
import { Progress } from './components/ui/progress';
import { toast, Toaster } from './components/ui/toast';
import { api } from './lib/api';


function App(): React.JSX.Element {
  const [progress, setProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');

  useEffect(() => {
    // Listen for streaming words from the AI
    const cleanup = api.onAiStream((chunk: string) => {
      setAiResponse((prev) => prev + chunk);
    });
    return cleanup;
  }, []);

  useEffect(() => {
    const cleanup = api.onDownloadProgress((data) => {
      setProgress(data.percentage);
    });

    // Cleanup on unmount
    return cleanup;
  }, []);

  useEffect(() => {
    if (progress === 100) {
      setIsDownloading(false);
      showToast("Download successful");
    }
  }, [progress]);

  const sayHello = async () => {
    console.log("Hello from the renderer!");
    const response = await api.askAi("qwen-7b.gguf", "Hello there!");
    setAiResponse(JSON.stringify(response, null, 2));
  }

  const showToast = (message: string) => {
    toast.add({
      description: message,
    })
  }

  async function handlePickAndExtract() {
    console.log('Opening file picker...')
    const filePath = await api.openFilePicker()

    if (!filePath) {
      console.log('User canceled file selection')
      return
    }

    const extractedText = await api.extractPdfText(filePath)
    console.log('Extracted PDF Content:\n', extractedText)
  }

  async function startDownload() {
    setIsDownloading(true);
    setProgress(0);

    try {
      showToast("Download started");

      const url = "https://huggingface.co/bartowski/Qwen2.5-7B-Instruct-GGUF/resolve/main/Qwen2.5-7B-Instruct-Q4_K_M.gguf";

      // Call the exposed backend function

      await api.downloadModel(url, "qwen-7b.gguf");
    } catch (error) {
      console.error("Download failed:", error);
      showToast("Download failed");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <>
      <img alt="logo" className="logo" src={electronLogo} />
      <div className="actions">
        <div className="flex flex-col gap-4">
          <Button onClick={handlePickAndExtract}>Extract PDF Text</Button>
          <Button onClick={startDownload}>Download</Button>
          {isDownloading &&
            <div className="flex flex-col">
              <Progress value={progress} className="w-full"></Progress>
              <p>Download Progress: {progress}%</p>
            </div>}
          <div className="flex flex-col mt-4">
            <p>AI Response: {aiResponse}</p>
          </div>
          <Button onClick={sayHello}>Say Hello to AI</Button>
        </div>
      </div>
      <Toaster />
    </>
  )
}

export default App
