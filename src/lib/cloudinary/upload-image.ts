export default async function uploadImage(file: any) {
  const thumbnail = new FormData();

  thumbnail.append("file", file);
  thumbnail.append("upload_preset", "portfolio");

  const response = await fetch(
    "https://api.cloudinary.com/v1_1/kaushaljoshi/image/upload",
    {
      method: "POST",
      body: thumbnail,
    }
  )
    .then((response) => response.json())
    .catch((error) => console.log(error));

  return response.url;
}
