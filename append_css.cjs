const fs = require('fs');
const css = `

/* Audience Category Images Layout */
.audience-category-scroll-container {
  width: 100%;
  overflow: hidden;
}

.audience-category-scroll {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding-bottom: 24px; /* padding for shadow visibility */
  margin-bottom: -8px;
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}

.audience-category-scroll::-webkit-scrollbar {
  display: none; /* Chrome, Safari and Opera */
}

.category-image-card {
  flex: 0 0 clamp(120px, 16vw, 150px);
  aspect-ratio: 3 / 4;
  border-radius: 12px;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  scroll-snap-align: start;
  transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.4s ease;
  border: none;
  padding: 0;
  background: #111;
}

.category-image-card:hover {
  transform: translateY(-6px) scale(1.02);
  box-shadow: 0 16px 28px rgba(0, 0, 0, 0.6);
  z-index: 2;
}

.category-image-card img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 1;
  transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
  will-change: transform;
}

.category-image-card:hover img {
  transform: scale(1.12);
}

.category-image-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 70%;
  background: linear-gradient(to bottom, rgba(5, 12, 35, 0.95) 0%, rgba(5, 12, 35, 0.5) 45%, transparent 100%);
  z-index: 2;
  pointer-events: none;
  transition: opacity 0.4s ease;
}

.category-image-card:hover::before {
  opacity: 0.85; /* slight fade on hover to make it feel dynamic */
}

.category-image-label {
  position: absolute;
  top: 16px;
  left: 10px;
  right: 10px;
  color: #ffffff;
  font-family: 'Noto Sans Thai', sans-serif;
  font-weight: 700;
  font-size: 15px;
  text-align: center;
  z-index: 3;
  text-shadow: 0 2px 10px rgba(0,0,0,0.8), 0 1px 3px rgba(0,0,0,0.6);
  line-height: 1.25;
  letter-spacing: 0.02em;
}

/* Ensure original button overrides are clean */
.category-image-card:focus {
  outline: none;
}
`;

fs.appendFileSync('src/index.css', css);
