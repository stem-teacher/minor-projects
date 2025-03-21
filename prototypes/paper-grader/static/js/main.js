/**
 * Main JavaScript file for the Exam Marking System
 */

document.addEventListener('DOMContentLoaded', function() {
    
    // Navigation highlight for current page
    const currentPath = window.location.pathname;
    document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
        const linkPath = link.getAttribute('href');
        if (currentPath === linkPath) {
            link.classList.add('active');
        }
    });
    
    // File upload preview functionality
    const fileInput = document.getElementById('file');
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            const fileCount = this.files.length;
            if (fileCount > 0) {
                const fileList = document.createElement('ul');
                fileList.className = 'list-group mt-3';
                
                for (let i = 0; i < fileCount; i++) {
                    const file = this.files[i];
                    const fileSize = (file.size / 1024).toFixed(2) + ' KB';
                    
                    const listItem = document.createElement('li');
                    listItem.className = 'list-group-item d-flex justify-content-between align-items-center';
                    listItem.innerHTML = `
                        <span>${file.name}</span>
                        <span class="badge badge-primary badge-pill">${fileSize}</span>
                    `;
                    
                    fileList.appendChild(listItem);
                }
                
                // Update preview area
                const previewArea = document.querySelector('.file-preview');
                if (previewArea) {
                    previewArea.innerHTML = '';
                    previewArea.appendChild(document.createElement('h5')).textContent = `Selected ${fileCount} file(s):`;
                    previewArea.appendChild(fileList);
                }
            }
        });
    }
    
    // Process page: Answer key form validation
    const answerKeyForm = document.querySelector('form');
    if (answerKeyForm && window.location.pathname.includes('/process')) {
        answerKeyForm.addEventListener('submit', function(e) {
            let isValid = true;
            const answerSelects = document.querySelectorAll('select[id^="q"]');
            
            answerSelects.forEach(select => {
                if (!select.value) {
                    isValid = false;
                    select.classList.add('is-invalid');
                } else {
                    select.classList.remove('is-invalid');
                }
            });
            
            if (!isValid) {
                e.preventDefault();
                const alertDiv = document.createElement('div');
                alertDiv.className = 'alert alert-danger alert-dismissible fade show';
                alertDiv.innerHTML = `
                    <strong>Error!</strong> Please select an answer for all questions.
                    <button type="button" class="close" data-dismiss="alert">&times;</button>
                `;
                
                // Insert alert at the top of the form
                answerKeyForm.insertBefore(alertDiv, answerKeyForm.firstChild);
            }
        });
    }
    
    // Edit result page: Calculate score as answers are changed
    const editForm = document.querySelector('form');
    if (editForm && window.location.pathname.includes('/edit/')) {
        const answerSelects = document.querySelectorAll('select[id^="q"]');
        
        answerSelects.forEach(select => {
            select.addEventListener('change', function() {
                updateScoreDisplay();
            });
        });
        
        function updateScoreDisplay() {
            // Count correct answers
            let correctCount = 0;
            let totalQuestions = 0;
            
            answerSelects.forEach(select => {
                const questionInfo = select.nextElementSibling;
                if (questionInfo && questionInfo.textContent.includes('Correct answer:')) {
                    totalQuestions++;
                    
                    const correctAnswer = questionInfo.textContent.match(/Correct answer: ([A-D])/)[1];
                    if (select.value === correctAnswer) {
                        correctCount++;
                    }
                }
            });
            
            // Update score display if it exists
            const scoreDisplay = document.querySelector('.score-display');
            if (scoreDisplay) {
                scoreDisplay.textContent = `${correctCount}/${totalQuestions}`;
                
                // Calculate percentage
                const percentage = (correctCount / totalQuestions * 100).toFixed(1);
                const percentageDisplay = document.querySelector('.percentage-display');
                if (percentageDisplay) {
                    percentageDisplay.textContent = `${percentage}%`;
                }
            }
        }
    }
    
    // Results page: Filter results by class
    const classFilter = document.getElementById('class-filter');
    if (classFilter) {
        classFilter.addEventListener('change', function() {
            const selectedClass = this.value;
            const resultRows = document.querySelectorAll('tbody tr');
            
            resultRows.forEach(row => {
                const classCell = row.cells[1]; // Assuming class is in the second column
                
                if (selectedClass === 'all' || classCell.textContent === selectedClass) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }
    
    // Auto-dismiss alerts after 5 seconds
    const alerts = document.querySelectorAll('.alert:not(.alert-permanent)');
    alerts.forEach(alert => {
        setTimeout(() => {
            const closeButton = alert.querySelector('.close');
            if (closeButton) {
                closeButton.click();
            }
        }, 5000);
    });
    
    // Image preview on hover for results table
    const resultLinks = document.querySelectorAll('.result-preview-link');
    if (resultLinks.length > 0) {
        resultLinks.forEach(link => {
            const previewContainer = document.createElement('div');
            previewContainer.className = 'preview-container';
            previewContainer.style.display = 'none';
            previewContainer.style.position = 'absolute';
            previewContainer.style.zIndex = '1000';
            previewContainer.style.border = '1px solid #ccc';
            previewContainer.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
            
            document.body.appendChild(previewContainer);
            
            link.addEventListener('mouseenter', function(e) {
                const imagePath = this.getAttribute('data-image');
                previewContainer.innerHTML = `<img src="${imagePath}" style="max-width: 300px; max-height: 300px;">`;
                previewContainer.style.display = 'block';
                
                // Position near the link
                const rect = this.getBoundingClientRect();
                previewContainer.style.top = `${rect.bottom + window.scrollY + 5}px`;
                previewContainer.style.left = `${rect.left + window.scrollX}px`;
            });
            
            link.addEventListener('mouseleave', function() {
                previewContainer.style.display = 'none';
            });
        });
    }
});
