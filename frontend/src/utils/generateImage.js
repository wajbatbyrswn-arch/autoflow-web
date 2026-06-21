export async function generatePostImage(productImageBase64, brandTheme, productData, isAiBackground = false) {
  return new Promise(async (resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      
      const sizes = {
        '1:1':  { w: 1080, h: 1080 },
        '4:5':  { w: 1080, h: 1350 },
        '16:9': { w: 1920, h: 1080 }
      };
      
      const ratio = brandTheme.aspect_ratio || '1:1';
      const { w, h } = sizes[ratio] || sizes['1:1'];
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');

      // 1. Background
      if (isAiBackground && productImageBase64) {
        // Here productImageBase64 is actually the AI generated image URL or base64
        const bgImg = await loadImage(productImageBase64);
        
        // Draw to cover canvas (crop to fit if necessary)
        const imgRatio = bgImg.width / bgImg.height;
        const canvasRatio = w / h;
        let drawW, drawH, drawX, drawY;
        
        if (imgRatio > canvasRatio) {
          drawH = h;
          drawW = h * imgRatio;
          drawX = (w - drawW) / 2;
          drawY = 0;
        } else {
          drawW = w;
          drawH = w / imgRatio;
          drawX = 0;
          drawY = (h - drawH) / 2;
        }
        ctx.drawImage(bgImg, drawX, drawY, drawW, drawH);
      } else {
        ctx.fillStyle = brandTheme.background_color || '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
      }

      // 2. Product Image
      if (productImageBase64 && !isAiBackground) {
        const productImgSrc = "data:image/jpeg;base64," + productImageBase64;
        const productImg = await loadImage(productImageBase64.startsWith('http') ? productImageBase64 : productImgSrc);
        
        // Calculate size to fit within 80% of canvas, keeping aspect ratio
        const maxImgSize = Math.min(w, h) * 0.8;
        const imgRatio = productImg.width / productImg.height;
        
        let drawW, drawH;
        if (imgRatio > 1) {
          drawW = maxImgSize;
          drawH = maxImgSize / imgRatio;
        } else {
          drawH = maxImgSize;
          drawW = maxImgSize * imgRatio;
        }
        
        const imgX = (w - drawW) / 2;
        const imgY = (h - drawH) / 2;
        
        // Add a soft shadow for the product
        ctx.shadowColor = 'rgba(0,0,0,0.15)';
        ctx.shadowBlur = 40;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 20;
        
        ctx.drawImage(productImg, imgX, imgY, drawW, drawH);
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }

      // 3. Price Badge
      if (productData.price) {
        drawPriceBadge(ctx, brandTheme, productData, w, h);
      }

      // 4. Logo
      if (brandTheme.logo_url) {
        try {
          const logo = await loadImage(brandTheme.logo_url);
          drawLogo(ctx, brandTheme.logo_position || 'top-left', logo, w, h);
        } catch (e) {
          console.warn('Failed to load logo', e);
        }
      }

      // 5. Frame
      if (brandTheme.frame_style && brandTheme.frame_style !== 'none') {
        drawFrame(ctx, brandTheme, w, h);
      }

      resolve(canvas.toDataURL('image/png', 0.9));
    } catch (error) {
      reject(error);
    }
  });
}

function drawPriceBadge(ctx, theme, productData, w, h) {
  const isBottomBar = theme.price_position === 'bottom-bar';
  const priceText = productData.price;
  
  ctx.font = `bold ${isBottomBar ? 48 : 36}px Cairo, sans-serif`;
  const textWidth = ctx.measureText(priceText).width;
  
  const padX = 40;
  const padY = 20;
  
  let boxW = isBottomBar ? w : textWidth + padX * 2;
  let boxH = isBottomBar ? 120 : 80;
  
  const positions = {
    'top-right':   { x: w - boxW - 40, y: 40 },
    'bottom-left': { x: 40, y: h - boxH - 40 },
    'center':      { x: (w - boxW) / 2, y: h - boxH - 60 },
    'bottom-bar':  { x: 0, y: h - boxH }
  };
  
  const pos = positions[theme.price_position || 'top-right'] || positions['top-right'];
  
  ctx.fillStyle = theme.primary_color || '#6C47FF';
  
  if (isBottomBar) {
    ctx.fillRect(pos.x, pos.y, boxW, boxH);
  } else {
    // Round rect
    const radius = 16;
    ctx.beginPath();
    ctx.moveTo(pos.x + radius, pos.y);
    ctx.lineTo(pos.x + boxW - radius, pos.y);
    ctx.quadraticCurveTo(pos.x + boxW, pos.y, pos.x + boxW, pos.y + radius);
    ctx.lineTo(pos.x + boxW, pos.y + boxH - radius);
    ctx.quadraticCurveTo(pos.x + boxW, pos.y + boxH, pos.x + boxW - radius, pos.y + boxH);
    ctx.lineTo(pos.x + radius, pos.y + boxH);
    ctx.quadraticCurveTo(pos.x, pos.y + boxH, pos.x, pos.y + boxH - radius);
    ctx.lineTo(pos.x, pos.y + radius);
    ctx.quadraticCurveTo(pos.x, pos.y, pos.x + radius, pos.y);
    ctx.closePath();
    ctx.fill();
  }
  
  ctx.fillStyle = theme.text_color === '#1A1A1A' && isDarkColor(theme.primary_color) ? '#FFFFFF' : (theme.text_color || '#FFFFFF');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(priceText, pos.x + boxW / 2, pos.y + boxH / 2 + 5);
}

function drawLogo(ctx, position, logo, w, h) {
  const maxLogoSize = 120;
  const pad = 40;
  
  const ratio = logo.width / logo.height;
  let logoW = maxLogoSize;
  let logoH = maxLogoSize / ratio;
  
  if (logoH > maxLogoSize) {
    logoH = maxLogoSize;
    logoW = maxLogoSize * ratio;
  }
  
  const positions = {
    'top-left':      { x: pad, y: pad },
    'top-right':     { x: w - logoW - pad, y: pad },
    'bottom-center': { x: (w - logoW) / 2, y: h - logoH - pad - 100 /* above possible bottom bar */ }
  };
  
  const pos = positions[position] || positions['top-left'];
  ctx.drawImage(logo, pos.x, pos.y, logoW, logoH);
}

function drawFrame(ctx, theme, w, h) {
  const style = theme.frame_style;
  ctx.strokeStyle = theme.secondary_color || '#FF6B6B';
  
  if (style === 'thin') {
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, w - 20, h - 20);
  } else if (style === 'thick') {
    ctx.lineWidth = 30;
    ctx.strokeRect(15, 15, w - 30, h - 30);
  } else if (style === 'rounded') {
    ctx.lineWidth = 15;
    const pad = 20;
    const r = 40;
    ctx.beginPath();
    ctx.moveTo(pad + r, pad);
    ctx.lineTo(w - pad - r, pad);
    ctx.quadraticCurveTo(w - pad, pad, w - pad, pad + r);
    ctx.lineTo(w - pad, h - pad - r);
    ctx.quadraticCurveTo(w - pad, h - pad, w - pad - r, h - pad);
    ctx.lineTo(pad + r, h - pad);
    ctx.quadraticCurveTo(pad, h - pad, pad, h - pad - r);
    ctx.lineTo(pad, pad + r);
    ctx.quadraticCurveTo(pad, pad, pad + r, pad);
    ctx.stroke();
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Helper to determine if text should be white or black over the primary color
function isDarkColor(hex) {
  if (!hex) return true;
  const c = hex.substring(1);
  const rgb = parseInt(c, 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >>  8) & 0xff;
  const b = (rgb >>  0) & 0xff;
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luma < 128;
}
