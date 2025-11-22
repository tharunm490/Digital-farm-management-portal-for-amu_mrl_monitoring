const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');

router.post('/', (req, res) => {
  const inputData = req.body;
  const pythonProcess = spawn('python', ['predict.py', JSON.stringify(inputData)], { cwd: __dirname + '/../' });

  let result = '';

  pythonProcess.stdout.on('data', (data) => {
    result += data.toString();
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(data.toString());
  });

  pythonProcess.on('close', (code) => {
    try {
      const prediction = JSON.parse(result);
      res.json(prediction);
    } catch (e) {
      res.status(500).json({ error: 'Prediction failed' });
    }
  });
});

module.exports = router;