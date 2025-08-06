import React, { useState } from 'react';

const ScheduleButton = ({ onSchedule }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const handleScheduleClick = () => {
    setShowPicker(true);
  };

  const handleConfirm = () => {
    if (!date || !time) {
      alert('Please select both date and time.');
      return;
    }
    setShowPicker(false);
    onSchedule(`${date}T${time}`);
  };

  return (
    <div style={{ display: 'inline-block', marginLeft: '12px' }}>
      <button
        type="button"
        onClick={handleScheduleClick}
        style={{
          backgroundColor: '#0A66C2',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: 600
        }}
      >
        Schedule
      </button>
      {showPicker && (
        <div style={{
          position: 'absolute',
          background: '#fff',
          border: '1px solid #E0E4E8',
          borderRadius: '8px',
          padding: '16px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          zIndex: 1002,
          marginTop: '8px'
        }}>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ marginRight: '8px', color: '#1A1A1A', fontWeight: 500 }}>Date:</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ marginRight: '8px', color: '#1A1A1A', fontWeight: 500 }}>Time:</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} />
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            style={{
              backgroundColor: '#0A66C2',
              color: 'white',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              marginRight: '8px'
            }}
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={() => setShowPicker(false)}
            style={{
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default ScheduleButton;
