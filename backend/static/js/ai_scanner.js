/**
 * AI Live Scanner & Auto-Classifier Frontend Component
 */

document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('imageFileInput');
    const dropzone = document.getElementById('aiScanDropzone');
    const previewContainer = document.getElementById('imagePreviewContainer');
    const previewImg = document.getElementById('previewImage');
    const scanBeam = document.getElementById('scanBeam');
    const aiResultsBox = document.getElementById('aiResultsBox');
    
    const titleInput = document.getElementById('titleInput');
    const descInput = document.getElementById('descInput');
    const categorySelect = document.getElementById('categorySelect');

    if (!dropzone || !fileInput) return;

    // Trigger file dialog on dropzone click
    dropzone.addEventListener('click', () => fileInput.click());

    // Drag and drop events
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropzone.classList.add('drag-over');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropzone.classList.remove('drag-over');
        });
    });

    dropzone.addEventListener('drop', (e) => {
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files;
            handleFileSelected(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (fileInput.files && fileInput.files.length > 0) {
            handleFileSelected(fileInput.files[0]);
        }
    });

    // Re-run AI analysis when description or title changes
    let debounceTimer;
    [titleInput, descInput].forEach(el => {
        if (el) {
            el.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    if (fileInput.files.length > 0 || (titleInput.value.length > 5 && descInput.value.length > 10)) {
                        triggerAIAnalysis();
                    }
                }, 700);
            });
        }
    });

    function handleFileSelected(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file (PNG, JPG, JPEG, WEBP).');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            previewImg.src = e.target.result;
            previewContainer.classList.remove('d-none');
            dropzone.querySelector('.upload-prompt').classList.add('d-none');
            triggerAIAnalysis();
        };
        reader.readAsDataURL(file);
    }

    async function triggerAIAnalysis() {
        if (!scanBeam || !aiResultsBox) return;

        // Show scanning animation
        scanBeam.style.display = 'block';
        aiResultsBox.classList.remove('d-none');
        document.getElementById('aiStatusText').innerHTML = '<span class="spinner-border spinner-border-sm text-primary me-2"></span> AI Vision & NLP Analyzing...';

        const formData = new FormData();
        formData.append('title', titleInput ? titleInput.value : '');
        formData.append('description', descInput ? descInput.value : '');
        if (fileInput.files.length > 0) {
            formData.append('image', fileInput.files[0]);
        }

        try {
            const res = await fetch('/api/ai/analyze', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            
            // Turn off scanning beam after slight delay for visual impact
            setTimeout(() => {
                scanBeam.style.display = 'none';
                renderAIResults(data);
            }, 600);

        } catch (err) {
            console.error('AI Analysis failed:', err);
            scanBeam.style.display = 'none';
            document.getElementById('aiStatusText').innerHTML = '⚠️ Analysis error. You can still select category manually.';
        }
    }

    function renderAIResults(data) {
        document.getElementById('aiStatusText').innerHTML = `✨ Classification complete: <strong>${data.category}</strong>`;
        
        const confBar = document.getElementById('aiConfidenceBar');
        const confText = document.getElementById('aiConfidenceText');
        if (confBar && confText) {
            confBar.style.width = `${data.confidence_percentage}%`;
            confText.textContent = `${data.confidence_percentage}% Confidence`;
            
            if (data.confidence_percentage > 85) {
                confBar.className = 'progress-bar bg-success';
            } else if (data.confidence_percentage > 70) {
                confBar.className = 'progress-bar bg-primary';
            } else {
                confBar.className = 'progress-bar bg-warning';
            }
        }

        // Priority badge
        const priorityBadge = document.getElementById('aiPriorityBadge');
        if (priorityBadge) {
            priorityBadge.textContent = `${data.predicted_priority} Priority`;
            priorityBadge.className = `badge badge-priority-${data.predicted_priority.toLowerCase()}`;
        }

        // Department recommendation
        const deptText = document.getElementById('aiDeptText');
        if (deptText) {
            deptText.textContent = data.suggested_department || 'General Administration';
        }

        // Detected tags
        const tagsContainer = document.getElementById('aiTagsContainer');
        if (tagsContainer && data.detected_tags) {
            tagsContainer.innerHTML = data.detected_tags
                .map(tag => `<span class="badge bg-light text-secondary border me-1 mb-1">#${tag}</span>`)
                .join('');
        }

        // Auto-select category if set to Auto or not modified
        if (categorySelect && (categorySelect.value === 'Auto-Detect' || categorySelect.value === '')) {
            categorySelect.value = data.category;
        }
    }
});
