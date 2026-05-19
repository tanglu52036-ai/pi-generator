/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const IMGBB_API = '/api/imgbb/1/upload';
const IMGBB_KEY = 'cbedc5a2280b020e99af3c40d99517ea';

interface ImgBBImage {
  filename: string;
  name: string;
  mime: string;
  extension: string;
  url: string;
}

interface ImgBBData {
  id: string;
  title: string;
  url_viewer: string;
  url: string;
  display_url: string;
  width: string;
  height: string;
  size: string;
  time: string;
  expiration: string;
  image: ImgBBImage;
  thumb: ImgBBImage;
  medium: ImgBBImage;
  delete_url: string;
}

interface ImgBBResponse {
  data: ImgBBData;
  success: boolean;
  status: number;
}

export const uploadToPostImages = async (
  blob: Blob,
  fileName: string,
): Promise<string | null> => {
  const formData = new FormData();
  formData.append('key', IMGBB_KEY);
  formData.append('image', blob, fileName);

  try {
    const response = await fetch(IMGBB_API, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      console.error('[ImgBB] Upload failed:', response.status);
      return null;
    }

    const result: ImgBBResponse = await response.json();

    if (result.success === true && result.data?.url) {
      return result.data.url;
    }

    console.error('[ImgBB] Unexpected response:', result);
    return null;
  } catch (err) {
    console.error('[ImgBB] Upload error:', err);
    return null;
  }
};