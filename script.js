const urlInput = document.getElementById('urlInput');
const downloadBtn = document.getElementById('downloadBtn');
const result = document.getElementById('result');
const error = document.getElementById('error');
const loading = document.getElementById('loading');
const videoPreview = document.getElementById('videoPreview');
const imagePreview = document.getElementById('imagePreview');
const videoTitle = document.getElementById('videoTitle');
const videoAuthor = document.getElementById('videoAuthor');
const videoMeta = document.getElementById('videoMeta');
const downloadMp4 = document.getElementById('downloadMp4');
const copyLink = document.getElementById('copyLink');

let currentVideoUrl = '';
let currentThumbnail = '';

function show(el) {
  [result, error, loading].forEach(e => e.classList.add('hidden'));
  el.classList.remove('hidden');
}

function isValidTikTokUrl(url) {
  const patterns = [
    /https?:\/\/(www\.)?tiktok\.com\/@[\w-]+\/video\/\d+/i,
    /https?:\/\/(vm\.tiktok\.com\/[\w-]+)/i,
  ];
  return patterns.some(p => p.test(url.trim()));
}

async function fetchTikTokVideo(url) {
  const apis = [
    {
      name: 'tikwm',
      url: `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`,
      extract: (d) => ({
        url: d.data?.play || d.data?.video_url || d.data?.url,
        thumbnail: d.data?.cover || d.data?.thumbnail,
        author: d.data?.author?.unique_id || d.data?.author?.username || ''
      })
    },
    {
      name: 'tikwm-v2',
      url: `https://tikwm.com/api/?url=${encodeURIComponent(url)}`,
      extract: (d) => ({
        url: d.data?.play || d.data?.video_url || d.data?.url,
        thumbnail: d.data?.cover || d.data?.thumbnail,
        author: d.data?.author?.unique_id || d.data?.author?.username || ''
      })
    },
    {
      name: 'snaptik',
      url: `https://snaptik.app/api/ajaxSearch?url=${encodeURIComponent(url)}`,
      extract: (d) => ({
        url: d.data?.url || d.url,
        thumbnail: d.data?.thumbnail || d.thumbnail,
        author: d.data?.author || d.author
      })
    },
    {
      name: 'tiktok-api',
      url: `https://tiktok-api.savasgsu.com/download?url=${encodeURIComponent(url)}`,
      extract: (d) => ({
        url: d.video || d.download_url || d.url,
        thumbnail: d.thumbnail || d.cover || '',
        author: d.author || d.username || ''
      })
    }
  ];
  
  for (const api of apis) {
    try {
      const response = await fetch(api.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json, text/html, */*'
        }
      });
      if (!response.ok) continue;
      
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        const match = text.match(/<video[^>]+src=["']([^"']+)["']/i) || text.match(/href=["']([^"']+\.mp4[^"']*)["']/i);
        if (match) {
          return { url: match[1], thumbnail: '', author: '' };
        }
        continue;
      }
      
      const result = api.extract(data);
      if (result.url) return result;
    } catch (e) {
      continue;
    }
  }
  
  throw new Error('Unable to fetch video. Try a different URL or check back later.');
}

downloadBtn.addEventListener('click', async () => {
  const url = urlInput.value.trim();
  if (!url) {
    error.textContent = 'Please paste a TikTok URL';
    show(error);
    return;
  }
  if (!isValidTikTokUrl(url)) {
    error.textContent = 'Please enter a valid TikTok URL';
    show(error);
    return;
  }

  downloadBtn.disabled = true;
  show(loading);

  try {
    const data = await fetchTikTokVideo(url);
    
    if (!data || !data.url) {
      throw new Error('No media found');
    }

    currentVideoUrl = data.url;
    currentThumbnail = data.thumbnail;

    videoPreview.src = data.url;
    videoPreview.hidden = false;
    imagePreview.hidden = true;
    videoTitle.textContent = 'TikTok Video';
    videoAuthor.textContent = data.author ? `@${data.author}` : '';
    videoMeta.textContent = 'Ready to download';

    if (data.thumbnail) {
      videoPreview.poster = data.thumbnail;
    }

    show(result);
  } catch (err) {
    error.textContent = err.message || 'Something went wrong. Try another link.';
    show(error);
  } finally {
    downloadBtn.disabled = false;
  }
});

downloadMp4.addEventListener('click', async () => {
  if (!currentVideoUrl) return;
  try {
    downloadMp4.textContent = 'Starting download...';
    downloadMp4.disabled = true;
    
    const response = await fetch(currentVideoUrl);
    if (!response.ok) {
      throw new Error('Download failed');
    }
    
    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = 'tiktok-video.mp4';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
  } catch (err) {
    error.textContent = err.message || 'Download failed';
    show(error);
  } finally {
    downloadMp4.textContent = '⬇ Download Video';
    downloadMp4.disabled = false;
  }
});

copyLink.addEventListener('click', async () => {
  if (!currentVideoUrl) return;
  try {
    await navigator.clipboard.writeText(currentVideoUrl);
    const original = copyLink.textContent;
    copyLink.textContent = 'Copied!';
    setTimeout(() => copyLink.textContent = original, 2000);
  } catch {
    error.textContent = 'Failed to copy link';
    show(error);
  }
});