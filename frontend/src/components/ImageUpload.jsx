import { useState } from 'react';
import { authenticatedFetch, handleApiResponse } from '../utils/api';

const ImageUpload = ({
  userName,
  openaiApiKey,
  useOwnKeys,
  onImageSelected,
  onImageGenerated,
  incrementApiCallCount,
  checkApiCallLimit
}) => {
  const [imagePrompt, setImagePrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
      
      onImageSelected(file, e.target.result);
    }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) {
      alert('Please enter an image prompt.');
      return;
    }

    if (!checkApiCallLimit()) {
      alert('API call limit reached for image generation.');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await authenticatedFetch('/api/ai/generate-image', {
        method: 'POST',
        body: JSON.stringify({
          prompt: imagePrompt,
          useOwnKeys,
          openaiApiKey: useOwnKeys ? openaiApiKey : ''
        }),
      });

      const data = await handleApiResponse(response);
      if (data.success) {
        setGeneratedImageUrl(data.image);
        onImageGenerated(data.image);
        incrementApiCallCount();
      } else {
        alert(data.message || 'Failed to generate image');
      }
    } catch (error) {
      console.error('Image generation error:', error);
      alert('Failed to generate image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const clearImage = () => {
    setSelectedFile(null);
    setImagePreview('');
    setGeneratedImageUrl('');
    setImagePrompt('');
    onImageSelected(null, null);
    onImageGenerated('');
  };

  return (
    <div className="image-upload">
      <h3>Image Generation & Upload</h3>
      
      {/* AI Image Generation */}
      <div className="input-group">
        <label htmlFor="imagePrompt">Generate AI Image</label>
        <textarea
          id="imagePrompt"
          value={imagePrompt}
          onChange={(e) => setImagePrompt(e.target.value)}
          placeholder="Describe the image you want to generate..."
          rows={3}
          className="prompt-input"
        />
        <button
          onClick={handleGenerateImage}
          disabled={isGenerating || !imagePrompt.trim() || !useOwnKeys}
          className="generate-btn"
        >
          {isGenerating ? 'Generating...' : 'Generate Image with DALL-E'}
        </button>
        {!useOwnKeys && (
          <p className="info-text">
            ⚠️ Image generation requires your own OpenAI API key
          </p>
        )}
      </div>

      {/* Generated Image Display */}
      {generatedImageUrl && (
        <div className="generated-image">
          <h4>Generated Image</h4>
          <img 
            src={generatedImageUrl} 
            alt="AI Generated" 
            className="preview-image"
          />
          <div className="image-actions">
            <button
              onClick={() => onImageGenerated(generatedImageUrl)}
              className="use-image-btn"
            >
              Use This Image
            </button>
            <button
              onClick={clearImage}
              className="clear-btn"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* File Upload */}
      <div className="input-group">
        <label htmlFor="imageFile">Upload Image</label>
        <input
          type="file"
          id="imageFile"
          accept="image/*"
          onChange={handleFileSelect}
          className="file-input"
        />
        <p className="info-text">
          Supported formats: JPEG, PNG, GIF (max 10MB)
        </p>
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div className="uploaded-image">
          <h4>Uploaded Image</h4>
          <img 
            src={imagePreview} 
            alt="Uploaded" 
            className="preview-image"
          />
          <div className="image-actions">
            <button
              onClick={() => onImageSelected(selectedFile, imagePreview)}
              className="use-image-btn"
            >
              Use This Image
            </button>
            <button
              onClick={clearImage}
              className="clear-btn"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Image URL Input */}
      <div className="input-group">
        <label htmlFor="imageUrl">Image URL</label>
        <input
          type="url"
          id="imageUrl"
          placeholder="https://example.com/image.jpg"
          className="url-input"
          onChange={(e) => {
            if (e.target.value) {
              onImageGenerated(e.target.value);
            }
          }}
        />
        <p className="info-text">
          Enter a direct link to an image
        </p>
      </div>
    </div>
  );
};

export default ImageUpload; 