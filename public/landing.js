const storage = window.localStorage;

function showProfileForm(profile) {
  const form = document.getElementById('profile-form');
  form.classList.remove('hidden');
  if (profile) {
    if (profile.name) {
      form.displayName.value = profile.name;
    }
    if (profile.birthdate) {
      form.birthdate.value = profile.birthdate;
    }
  }
}

window.handleCredentialResponse = async function handleCredentialResponse(response) {
  const { credential } = response;
  if (!credential) return;
  storage.setItem('idToken', credential);
  try {
    const profile = await fetch('/api/me', {
      headers: {
        Authorization: `Bearer ${credential}`
      }
    }).then(res => res.json());
    showProfileForm(profile);
  } catch (error) {
    console.error('Failed to load profile', error);
    showProfileForm();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const savedToken = storage.getItem('idToken');
  if (savedToken) {
    fetch('/api/me', {
      headers: {
        Authorization: `Bearer ${savedToken}`
      }
    })
      .then(res => res.ok ? res.json() : null)
      .then(profile => {
        if (profile) {
          showProfileForm(profile);
        }
      })
      .catch(() => {
        storage.removeItem('idToken');
      });
  }

  const form = document.getElementById('profile-form');
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const token = storage.getItem('idToken');
    if (!token) {
      alert('Sign in with Google first.');
      return;
    }
    const payload = {
      name: form.displayName.value,
      birthdate: form.birthdate.value
    };
    const res = await fetch('/api/me', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'Failed to save profile');
      return;
    }
    window.location.href = '/dashboard.html';
  });
});
