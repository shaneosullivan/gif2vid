# gif2vid Next.js Client-Side Example

This example demonstrates how to use **gif2vid** for **client-side GIF to MP4 conversion** in a Next.js application using the WebCodecs API.

## 🌟 Features

- **Client-Side Processing**: Converts GIFs entirely in the browser - no server upload required
- **Zero Server Load**: All conversion happens on the client using WebCodecs
- **Complete Privacy**: Files never leave the user's device
- **Real-time Feedback**: Shows conversion progress and statistics
- **Beautiful UI**: Modern, responsive interface built with Tailwind CSS
- **Side-by-Side Comparison**: View original GIF and converted MP4 together

## 🚀 How It Works

1. User selects a GIF file
2. File is read client-side using the FileReader API
3. `convertGifBuffer()` processes the GIF using the browser's WebCodecs API
4. MP4 video is generated and displayed
5. User can download the converted MP4

## 📋 Prerequisites

- Node.js 20 or higher
- Modern browser with WebCodecs support (Chrome 94+, Edge 94+)

## 🛠️ Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the main gif2vid library (from project root):
   ```bash
   cd ../../..
   npm run build
   ```

3. Return to this example and start the dev server:
   ```bash
   cd examples/projects/nextjs-client-app
   npm run dev
   ```

4. Open http://localhost:3338 in your browser

## 📦 Key Dependencies

- `gif2vid` - The GIF to MP4 converter library
- `h264-mp4-encoder` - H.264 encoding for browser (automatically bundled)
- `next` - React framework
- `tailwindcss` - Styling

## 🎯 Use Cases

This client-side approach is perfect for:

- **Privacy-Sensitive Applications**: Medical, legal, or personal content
- **Offline Capabilities**: Works without internet connection
- **High-Volume Scenarios**: No server bandwidth or processing costs
- **User Experience**: Instant conversion without upload delays

## ⚠️ Browser Compatibility

Requires browsers with WebCodecs API support:
- Chrome/Edge 94+
- Opera 80+
- **Not supported**: Firefox, Safari (as of 2025)

For universal browser support, see the `nextjs-app` example which uses server-side conversion.

## 🔍 Comparison with Server-Side Example

| Feature | Client-Side (This) | Server-Side (`nextjs-app`) |
|---------|-------------------|---------------------------|
| Browser Support | Chrome/Edge only | All browsers |
| Privacy | Complete | Requires upload |
| Server Load | None | High |
| Processing Speed | Depends on device | Consistent |
| Offline Support | Yes | No |

## 📝 Code Structure

```
nextjs-client-app/
├── app/
│   ├── page.tsx          # Main conversion UI
│   ├── layout.tsx        # App layout
│   └── globals.css       # Global styles
├── public/
│   └── test1.gif         # Sample GIF for testing
├── package.json
├── next.config.ts
└── tsconfig.json
```

## 🎨 Customization

The UI uses Tailwind CSS for styling. You can customize:
- Color scheme in `app/page.tsx`
- Layout in `app/layout.tsx`
- Tailwind config in `tailwind.config.ts`

## 🐛 Troubleshooting

**"WebCodecs is not supported"**:
- Use Chrome 94+ or Edge 94+
- Check browser compatibility at https://caniuse.com/webcodecs

**Build errors**:
- Ensure you've built the main library: `npm run build` from project root
- Delete `.next` and `node_modules`, then reinstall

**Port already in use**:
- Kill existing process: `npm run devkill`
- Or use a different port: `next dev -p 3339`

## 📚 Learn More

- [gif2vid Documentation](../../../README.md)
- [WebCodecs API](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API)
- [Next.js Documentation](https://nextjs.org/docs)
