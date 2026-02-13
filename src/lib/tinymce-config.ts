export const TINYMCE_CONFIG = {
  apiKey: 'g8lx07l5r583teptgt9zqbr4ocex95k8xtd8v0h15fcspf8z',
  height: 400,
  menubar: false,
  plugins: [
    'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
    'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
    'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
  ],
  toolbar: 'undo redo | blocks | ' +
    'bold italic forecolor | alignleft aligncenter ' +
    'alignright alignjustify | bullist numlist outdent indent | ' +
    'removeformat | image | help',
  content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
  automatic_uploads: true,
  file_picker_types: 'image',
  images_upload_url: '/api/upload-image',
  images_upload_base_path: '/api/upload-image',
  // Configuration pour l'upload d'images
  images_upload_handler: async (blobInfo: any, progress: any, failure: any) => {
    try {
      const formData = new FormData();
      formData.append('image', blobInfo.blob(), 'image.jpg');
      formData.append('componentId', 'blog-editor');
      formData.append('fieldId', 'content');

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'upload');
      }

      const result = await response.json();
      return result.imageUrl;
    } catch (error) {
      console.error('Erreur upload image:', error);
      failure('Erreur lors de l\'upload de l\'image');
      return '';
    }
  },
}; 