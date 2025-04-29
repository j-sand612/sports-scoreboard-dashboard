import React from 'react';

function DateSelector({ selectedDate, onPrevDay, onNextDay, onToday }) {
  // Format date for display: "Tuesday, April 29, 2025"
  const formattedDate = selectedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Check if selected date is today
  const isToday = new Date().toDateString() === selectedDate.toDateString();
  
  return (
    <div className="date-selector">
      <div className="date-navigation">
        <button onClick={onPrevDay} className="nav-button">
          &lt; Previous Day
        </button>
        
        <div className="current-date">
          {formattedDate}
        </div>
        
        {!isToday && (
          <button onClick={onToday} className="today-button">
            Today
          </button>
        )}
        
        <button onClick={onNextDay} className="nav-button">
          Next Day &gt;
        </button>
      </div>
    </div>
  );
}

export default DateSelector;