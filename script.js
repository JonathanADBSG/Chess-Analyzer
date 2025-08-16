// --- CONFIGURATION ---
// IMPORTANT: Paste your Google Apps Script Web App URL here
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwqTlhkVuxEXuySJKa1VVgjbW6Zica3jptQHeHM1VjNhP1nxihJKTcz6GDC5H89hNUB/exec";

// --- SCRIPT ---
const form = document.getElementById('game-form');
const submitButton = form.querySelector('button[type="submit"]');

/**
 * Handles the form submission event.
 * @param {Event} e The submission event.
 */
async function handleFormSubmit(e) {
  e.preventDefault(); // Prevent the default page reload
  
  // Disable the button to prevent multiple submissions
  submitButton.disabled = true;
  submitButton.textContent = 'Saving...';

  try {
    const formData = new FormData(form);
    // Convert FormData to a plain object
    const dataObject = Object.fromEntries(formData);
    console.log("DataObject being sent:", dataObject);

    // Send the data to the Google Apps Script
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(dataObject)
    });

    const result = await response.json();

    // Show a success or error message to the user
    if (result.status === 'success') {
      alert('Success! Your game has been saved.');
      form.reset(); // Clear the form for the next entry
    } else {
      // Show the specific error message from the script
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Error:', error);
    alert(`An error occurred: ${error.message}`);
  } finally {
    // Re-enable the button
    submitButton.disabled = false;
    submitButton.textContent = 'Save Game';
  }
}

// Add the event listener to the form

form.addEventListener('submit', handleFormSubmit);
