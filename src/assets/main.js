function generateUrl() {
  const tverUrl = document.getElementById('tver-url').value;
  if (!tverUrl) {
    alert('TVerの番組URLを入力してください。');
    return;
  }
  
  const fetchButton = document.getElementById('fetchButton');
  const resultDiv = document.getElementById('result');
  
  fetchButton.disabled = true;
  fetchButton.textContent = '取得中...';
  resultDiv.innerHTML = '';

  fetch(`/api/m3u8?url=${encodeURIComponent(tverUrl)}`)
    .then(response => {
      if (!response.ok) {
        return response.text().then(text => { throw new Error(text || `サーバーエラー: ${response.status}`) });
      }
      return response.text();
    })
    .then(m3u8Url => {
      resultDiv.innerHTML = `
        <p>生成されたURL:</p>
        <a href="${m3u8Url}" target="_blank">${m3u8Url}</a>
        <button id="copy-button" onclick="copyToClipboard('${m3u8Url}')">コピー</button>
      `;
    })
    .catch(error => {
      resultDiv.innerHTML = `<p style="color: red;">エラー: ${error.message}</p>`;
    })
    .finally(() => {
      fetchButton.disabled = false;
      fetchButton.textContent = '取得';
    });
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert('コピーしました！');
  }, (err) => {
    alert('コピーに失敗しました: ' + err);
  });
}

document.getElementById('fetchButton').addEventListener('click', generateUrl);
