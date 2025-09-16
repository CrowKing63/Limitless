// Sound generation script for accessibility-themed game audio
// This script generates Web Audio API compatible sounds

// Function to generate a positive empowerment sound (XP collection)
function generateEmpowermentSound() {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  // Create an ascending, harmonious sound
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
  oscillator.frequency.exponentialRampToValueAtTime(783.99, audioCtx.currentTime + 0.3); // G5
  
  gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
  
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.3);
}

// Function to generate a barrier hit sound (taking damage)
function generateBarrierSound() {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  // Create a dissonant, descending sound
  oscillator.type = 'square';
  oscillator.frequency.setValueAtTime(220, audioCtx.currentTime); // A3
  oscillator.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 0.2); // A2
  
  gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
  
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.2);
}

// Function to generate an attack sound (empowerment projectile)
function generateAttackSound() {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  // Create a sharp, focused sound
  oscillator.type = 'sawtooth';
  oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
  oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1); // A5
  
  gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
  
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.1);
}

// Function to generate an enemy hit sound
function generateEnemyHitSound() {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  // Create a short, percussive sound
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(330, audioCtx.currentTime); // E4
  oscillator.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 0.15); // A3
  
  gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
  
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.15);
}

// Function to generate a level up sound
function generateLevelUpSound() {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  // Play a short melody
  const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  const duration = 0.1;
  
  frequencies.forEach((freq, index) => {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime + index * duration);
    
    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime + index * duration);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + index * duration + duration);
    
    oscillator.start(audioCtx.currentTime + index * duration);
    oscillator.stop(audioCtx.currentTime + index * duration + duration);
  });
}

// Function to generate a menu navigation sound
function generateMenuSound() {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  // Create a clean, digital sound
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
  
  gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
  
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.05);
}

// Export functions for use in the game
(window as any).generateEmpowermentSound = generateEmpowermentSound;
(window as any).generateBarrierSound = generateBarrierSound;
(window as any).generateAttackSound = generateAttackSound;
(window as any).generateEnemyHitSound = generateEnemyHitSound;
(window as any).generateLevelUpSound = generateLevelUpSound;
(window as any).generateMenuSound = generateMenuSound;