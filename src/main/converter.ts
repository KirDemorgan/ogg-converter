import { spawn } from 'child_process'

export function convertFile(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', inputPath,
      '-vn',
      '-ar', '44100',
      '-ac', '2',
      '-b:a', '192k',
      '-y',
      outputPath
    ])

    let stderr = ''
    ffmpeg.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`ffmpeg error (code ${code}): ${stderr.slice(-300)}`))
      }
    })

    ffmpeg.on('error', (err) => {
      reject(new Error(`ffmpeg not found: ${err.message}`))
    })
  })
}
