/* Registration form: validation, order summary, MyFatoorah checkout call */

document.addEventListener('DOMContentLoaded', () => {
  const courses = ReemoraStore.getCourses();
  const courseSelect = document.getElementById('course-select');
  const form = document.getElementById('register-form');
  const alertBox = document.getElementById('form-alert');
  const submitBtn = document.getElementById('submit-btn');

  courseSelect.innerHTML = courses.map(c =>
    `<option value="${c.id}">${c.title} — ${formatMoney(c.price, c.currency)}</option>`
  ).join('');

  const preselect = qs('course');
  if (preselect && courses.some(c => c.id === preselect)) {
    courseSelect.value = preselect;
  }

  function currentCourse() {
    return ReemoraStore.getCourseById(courseSelect.value);
  }

  function updateSummary() {
    const course = currentCourse();
    const seats = Math.max(1, parseInt(document.getElementById('seats').value || '1', 10));
    if (!course) return;
    document.getElementById('sum-course').textContent = course.title;
    document.getElementById('sum-date').textContent = formatDate(course.startDate);
    document.getElementById('sum-price').textContent = formatMoney(course.price, course.currency);
    document.getElementById('sum-seats').textContent = seats;
    document.getElementById('sum-total').textContent = formatMoney(course.price * seats, course.currency);
  }

  courseSelect.addEventListener('change', updateSummary);
  document.getElementById('seats').addEventListener('input', updateSummary);
  updateSummary();

  function setFieldError(fieldEl, hasError) {
    const wrapper = fieldEl.closest('.field');
    wrapper.classList.toggle('invalid', hasError);
  }

  function validate() {
    let valid = true;
    const name = document.getElementById('full-name');
    const email = document.getElementById('email');
    const phone = document.getElementById('phone');
    const terms = document.getElementById('terms');

    const nameOk = name.value.trim().length > 1;
    setFieldError(name, !nameOk);
    valid = valid && nameOk;

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
    setFieldError(email, !emailOk);
    valid = valid && emailOk;

    const phoneOk = /^[0-9+\s()-]{7,20}$/.test(phone.value.trim());
    setFieldError(phone, !phoneOk);
    valid = valid && phoneOk;

    const termsOk = terms.checked;
    terms.closest('.field').classList.toggle('invalid', !termsOk);
    valid = valid && termsOk;

    return valid;
  }

  function showAlert(message, type) {
    alertBox.textContent = message;
    alertBox.className = `alert show alert-${type}`;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertBox.className = 'alert';

    if (!validate()) {
      showAlert('Please fix the highlighted fields before continuing.', 'error');
      return;
    }

    const course = currentCourse();
    const seats = Math.max(1, parseInt(document.getElementById('seats').value || '1', 10));
    const totalAmount = Number((course.price * seats).toFixed(2));

    const registration = {
      courseId: course.id,
      courseTitle: course.title,
      fullName: document.getElementById('full-name').value.trim(),
      email: document.getElementById('email').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      seats,
      notes: document.getElementById('notes').value.trim(),
      amount: totalAmount,
      currency: course.currency,
      paymentStatus: 'pending'
    };

    const saved = ReemoraStore.addRegistration(registration);

    submitBtn.disabled = true;
    submitBtn.textContent = 'Connecting to secure payment...';

    try {
      // In production this calls a serverless function (see netlify/functions/myfatoorah-payment.js)
      // which holds the MyFatoorah API key server-side and returns a hosted InvoiceURL to redirect to.
      const response = await fetch('/.netlify/functions/myfatoorah-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationId: saved.id,
          customerName: registration.fullName,
          customerEmail: registration.email,
          customerPhone: registration.phone,
          amount: totalAmount,
          currency: registration.currency,
          courseTitle: course.title
        })
      });

      if (!response.ok) throw new Error('Payment service unavailable');
      const data = await response.json();

      if (data && data.invoiceUrl) {
        window.location.href = data.invoiceUrl;
        return;
      }
      throw new Error('No payment URL returned');
    } catch (err) {
      // Expected when previewing the site without the Netlify function deployed.
      showAlert(
        `Your registration was saved (ref: ${saved.id}). The secure MyFatoorah payment step requires this site to be deployed with the payment function configured — see README.md for setup. Our team will follow up to complete payment.`,
        'info'
      );
      submitBtn.disabled = false;
      submitBtn.textContent = 'Proceed to Secure Payment';
    }
  });
});
