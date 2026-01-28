import React, { useState, useEffect } from 'react';

// --- Configuration ---
const GRID_SIZE = 5;
const COLORS = {
  bg: '#f0f0f0',
  dot: '#B2BEB5',   // Ash Gray
  flash: '#FFD700', // Gold
  success: '#4CAF50',
  error: '#F44336',
  white: '#ffffff',
  text: '#000000'
};

// --- Shape Component for Distraction Phase ---
const Shape = ({ type, color, size = 80 }) => {
  const style = { fill: color, width: size, height: size };
  
  if (type === 0) { // Square
    return <svg style={style} viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" /></svg>;
  } else if (type === 1) { // Circle
    return <svg style={style} viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" /></svg>;
  } else { // Triangle
    return <svg style={style} viewBox="0 0 100 100"><polygon points="50,15 90,85 10,85" /></svg>;
  }
};

export default function MemoryInterferenceGame() {
  // --- Game State ---
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState('START'); // START, FLASH, DISTRACTION, RECALL
  const [sequence, setSequence] = useState([]); // Array of string coordinates "r-c"
  const [currentStep, setCurrentStep] = useState(0); // How many items shown in current loop
  const [flashingDot, setFlashingDot] = useState(null); // The dot currently yellow
  const [userClicks, setUserClicks] = useState([]); // User's recall answers
  const [distractionData, setDistractionData] = useState(null); // Holds shape data
  
  // --- Timer State ---
  const [timeLeft, setTimeLeft] = useState(0);

  // Max Levels
  const MAX_LEVELS = 7;

  // --- Logic: Timer Hook ---
  useEffect(() => {
    let timerId;

    // Only run timer if we are in RECALL phase and time is > 0
    if (gameState === 'RECALL' && timeLeft > 0) {
      timerId = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    } else if (gameState === 'RECALL' && timeLeft === 0) {
      // Time is up!
      alert(`Time's up! You must be faster. Restarting Level ${level}.`);
      setGameState('START');
    }

    // Cleanup interval on unmount or state change
    return () => clearInterval(timerId);
  }, [gameState, timeLeft, level]);

  // --- Logic: Start Level ---
  const startLevel = () => {
    setSequence([]);
    setCurrentStep(0);
    setUserClicks([]);
    runSequenceStep(0, []);
  };

  // --- Logic: The Game Loop ---
  const runSequenceStep = (stepIndex, currentSeq) => {
    if (stepIndex < level) {
      // 1. EVENT: FLASH
      setGameState('FLASH');
      
      let r, c, coord;
      do {
        r = Math.floor(Math.random() * GRID_SIZE);
        c = Math.floor(Math.random() * GRID_SIZE);
        coord = `${r}-${c}`;
      } while (currentSeq.includes(coord));
      
      const newSeq = [...currentSeq, coord];
      setSequence(newSeq);
      setFlashingDot(coord);

      const baseTime = 3000;
      const reduction = (level - 1) * 400;
      const duration = Math.max(500, baseTime - reduction);

      setTimeout(() => {
        setFlashingDot(null);
        setupDistraction(stepIndex, newSeq);
      }, duration);
    } else {
      // 3. EVENT: RECALL PHASE
      startRecallPhase();
    }
  };

  // Helper to init the recall phase and set the timer
  const startRecallPhase = () => {
    setGameState('RECALL');
    // Set Timer based on Level
    if (level <= 5) {
      setTimeLeft(20);
    } else {
      setTimeLeft(30);
    }
  };

  // --- Logic: Distraction Setup ---
  const setupDistraction = (stepIndex, currentSeq) => {
    setGameState('DISTRACTION');
    
    const shapeTypes = [0, 1, 2]; 
    const colors = ['red', 'blue', 'green'];
    
    const isSame = Math.random() < 0.5;
    const leftShape = Math.floor(Math.random() * 3);
    const leftColor = colors[Math.floor(Math.random() * colors.length)];
    
    let rightShape, rightColor;

    if (isSame) {
      rightShape = leftShape;
      rightColor = leftColor;
    } else {
      rightShape = Math.floor(Math.random() * 3);
      rightColor = colors[Math.floor(Math.random() * colors.length)];
      if (rightShape === leftShape && rightColor === leftColor) {
        rightColor = 'black'; 
      }
    }

    setDistractionData({
      left: { type: leftShape, color: leftColor },
      right: { type: rightShape, color: rightColor },
      stepIndex: stepIndex,
      currentSeq: currentSeq
    });
  };

  const handleDistractionAnswer = () => {
    const nextStep = distractionData.stepIndex + 1;
    setCurrentStep(nextStep);
    runSequenceStep(nextStep, distractionData.currentSeq);
  };

  // --- Logic: User Interaction (Recall) ---
  const handleDotClick = (r, c) => {
    if (gameState !== 'RECALL') return;
    
    const coord = `${r}-${c}`;
    
    if (userClicks.includes(coord)) return;

    const nextIndexToFind = userClicks.length;
    const expectedCoord = sequence[nextIndexToFind];

    if (coord === expectedCoord) {
      const newClicks = [...userClicks, coord];
      setUserClicks(newClicks);

      if (newClicks.length === sequence.length) {
        // We set timeout to allow the user to see the last green dot briefly
        setTimeout(() => {
          if (level < MAX_LEVELS) {
            alert("Correct! Moving to next level.");
            setLevel(level + 1);
            setGameState('START');
          } else {
            alert("Champion! You finished all 7 Levels!");
            setLevel(1);
            setGameState('START');
          }
        }, 200);
      }

    } else {
      setUserClicks([...userClicks, coord]); 
      setTimeout(() => {
        alert(`Wrong! You must click in the exact order (1, 2, 3...). Restarting Level ${level}.`);
        setGameState('START');
      }, 100);
    }
  };

  // --- Render Helpers ---
  const renderGrid = () => {
    const grid = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const coord = `${r}-${c}`;
        let bgColor = COLORS.dot;
        let dotNumber = null; 

        if (gameState === 'FLASH' && flashingDot === coord) {
          bgColor = COLORS.flash;
          dotNumber = currentStep + 1; 
        }

        if (gameState === 'RECALL') {
          const clickIndex = userClicks.indexOf(coord);
          if (clickIndex !== -1) {
            if (sequence[clickIndex] === coord) {
              bgColor = COLORS.success;
              dotNumber = clickIndex + 1; 
            } else {
              bgColor = COLORS.error; 
            }
          }
        }

        grid.push(
          <div
            key={coord}
            onClick={() => handleDotClick(r, c)}
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              backgroundColor: bgColor,
              border: '2px solid #999',
              cursor: gameState === 'RECALL' ? 'pointer' : 'default',
              transition: 'background-color 0.2s',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontWeight: 'bold',
              fontSize: '20px',
              color: bgColor === COLORS.flash ? 'black' : 'white', 
              userSelect: 'none'
            }}
          >
            {dotNumber}
          </div>
        );
      }
    }
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
        gap: '15px',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        {grid}
      </div>
    );
  };

  // --- Main Render ---
  return (
    <div style={{ 
      fontFamily: 'Arial, sans-serif', 
      textAlign: 'center', 
      minHeight: '100vh',
      backgroundColor: '#f4f4f9',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px'
    }}>
      
      {/* HEADER */}
      <h1 style={{ color: '#333' }}>
        {gameState === 'START' && level > 1 ? "Keep Going!" : "Visuospatial Memory Game"}
      </h1>

      {/* TIMER DISPLAY (Only visible during RECALL) */}
      {gameState === 'RECALL' && (
        <div style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: timeLeft <= 5 ? 'red' : '#333', // Turn red when running out
          marginBottom: '10px'
        }}>
          Time Left: {timeLeft}s
        </div>
      )}

      {/* START SCREEN */}
      {gameState === 'START' && (
        <div style={{ maxWidth: '600px', backgroundColor: 'white', padding: '30px', borderRadius: '10px' }}>
          <p style={{ textAlign: 'left', lineHeight: '1.6' }}>
            <strong>Rules:</strong><br/>
            1. You will see a grid of ash dots.<br/>
            2. Dots will flash <strong style={{color:'#D4Af37'}}>Gold</strong> with a number (1, 2...).<br/>
            3. Answer the distraction question between flashes.<br/>
            4. Finally, click the dots in the <strong style={{color:'red'}}>EXACT ORDER</strong>.<br/>
            5. <strong style={{color:'blue'}}>Timer:</strong> 20s (Levels 1-5), 30s (Levels 6+).
          </p>
          <button 
            onClick={startLevel}
            style={{
              marginTop: '20px',
              padding: '15px 30px',
              fontSize: '18px',
              backgroundColor: COLORS.success,
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            {level === 1 ? "Start Level 1" : `Continue Level ${level}`}
          </button>
        </div>
      )}

      {/* FLASH PHASE */}
      {gameState === 'FLASH' && (
        <div>
          <h3>Level {level} - Memorize Dot {currentStep + 1}</h3>
          {renderGrid()}
        </div>
      )}

      {/* DISTRACTION PHASE */}
      {gameState === 'DISTRACTION' && distractionData && (
        <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '10px' }}>
          <h2>Are these shapes IDENTICAL?</h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '50px', margin: '30px 0' }}>
            <Shape type={distractionData.left.type} color={distractionData.left.color} />
            <Shape type={distractionData.right.type} color={distractionData.right.color} />
          </div>
          <div>
            <button 
              onClick={handleDistractionAnswer}
              style={btnStyle}
            >YES</button>
            <button 
              onClick={handleDistractionAnswer}
              style={{...btnStyle, marginLeft: '20px'}}
            >NO</button>
          </div>
        </div>
      )}

      {/* RECALL PHASE */}
      {gameState === 'RECALL' && (
        <div>
          <h2 style={{ color: '#333' }}>Select dots in order (1 to {sequence.length})</h2>
          {renderGrid()}
        </div>
      )}
      
    </div>
  );
}

// Simple button style object
const btnStyle = {
  padding: '10px 30px',
  fontSize: '16px',
  cursor: 'pointer',
  backgroundColor: '#2196F3',
  color: 'white',
  border: 'none',
  borderRadius: '4px'
};