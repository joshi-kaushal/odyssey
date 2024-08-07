import { v2 as cloudinary } from "cloudinary";

export default async function uploadImage(file: File, fileName: string) {
  
  const bytes = await file.arrayBuffer();
  const buffer = await Buffer.from(bytes).toString("base64");

  const base64Img = `data:image/${file.type.split("/")[1]};base64,${buffer}`;

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  const upload = await cloudinary.uploader.upload(base64Img, {
    folder: "/blog/thumbnails",
    public_id: fileName,
  });
  const url = upload.secure_url.replace("/upload", "/upload/f_auto")

  return {
    success: true,
    errors: null,
    data: url,
  };
}
// export default async function uploadImage(file: any) {
//   const thumbnail = new FormData();
//   console.log(file instanceof File);

//   thumbnail.append("file", file);
//   thumbnail.append("upload_preset", "portfolio");
//   const response = await fetch(
//     "https://api.cloudinary.com/v1_1/kaushaljoshi/image/upload",
//     {
//       method: "POST",
//       body: thumbnail,
//     }
//   )
//     .then((response) => response.json())
//     .catch((error) => console.error(error));

//   return response.url;
// }
