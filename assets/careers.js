(() => {
  'use strict';
  const maxFileBytes = 5 * 1024 * 1024;
  document.querySelectorAll('[data-career-form]').forEach(form => {
    const cv = form.querySelector('[data-career-cv]');
    const cvURL = form.querySelector('[data-career-cv-url]');
    const error = form.querySelector('#cv-error');
    const validateCV = () => {
      let message = '';
      const file = cv.files?.[0];
      if (file && !/\.(pdf|doc|docx)$/i.test(file.name)) message = 'Choose a PDF, DOC or DOCX file.';
      else if (file && file.size > maxFileBytes) message = 'Your CV must be 5 MB or smaller. You can provide a CV link instead.';
      else if (!file && !cvURL.value.trim()) message = 'Upload your CV or provide a viewable CV link.';
      cv.setCustomValidity(message);
      error.textContent = message;
      cv.setAttribute('aria-invalid', message ? 'true' : 'false');
      return !message;
    };
    cv.addEventListener('change', validateCV);
    cvURL.addEventListener('input', validateCV);
    form.addEventListener('submit', event => {
      if (!validateCV() || !form.checkValidity()) {
        event.preventDefault();
        form.reportValidity();
      }
      // A valid form uses native multipart POST. Never report success locally:
      // FormSubmit handles delivery, anti-spam checks and the return URL.
    });
    form.addEventListener('reset', () => {
      cv.setCustomValidity('');
      cv.removeAttribute('aria-invalid');
      error.textContent = '';
    });
  });
})();
