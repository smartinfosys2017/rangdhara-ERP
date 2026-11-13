import { NextResponse } from "next/server";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import crypto from "crypto";

/*
|--------------------------------------------------------------------------
| Allowed image MIME types
|--------------------------------------------------------------------------
*/

const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

/*
|--------------------------------------------------------------------------
| Maximum file size 
|--------------------------------------------------------------------------
*/

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/*
|--------------------------------------------------------------------------
| Dangerous extensions
|--------------------------------------------------------------------------
|
| Do not allow server-executable files to be uploaded.
|
*/

const BLOCKED_EXTENSIONS = [
  ".php",
  ".php3",
  ".php4",
  ".php5",
  ".phtml",
  ".phar",
  ".exe",
  ".sh",
  ".bat",
  ".cmd",
  ".com",
  ".msi",
  ".cgi",
  ".pl",
  ".py",
  ".jsp",
  ".asp",
  ".aspx",
];

/*
|--------------------------------------------------------------------------
| Normalize field type
|--------------------------------------------------------------------------
*/

function normalizeFieldType(type) {
  return String(type || "")
    .trim()
    .toLowerCase()
    .replace(/[-\s]/g, "_");
}

/*
|--------------------------------------------------------------------------
| Sanitize file name
|--------------------------------------------------------------------------
*/

function sanitizeFileName(fileName) {
  return String(fileName || "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .trim();
}

/*
|--------------------------------------------------------------------------
| Get safe extension
|--------------------------------------------------------------------------
*/

function getSafeExtension(fileName) {
  const extension = path.extname(fileName || "").toLowerCase();

  if (!extension) {
    return "";
  }

  if (BLOCKED_EXTENSIONS.includes(extension)) {
    return null;
  }

  return extension;
}

/*
|--------------------------------------------------------------------------
| POST
|--------------------------------------------------------------------------
*/

export async function POST(request) {
  const savedFiles = [];

  try {
    /*
    |--------------------------------------------------------------------------
    | Read multipart/form-data
    |--------------------------------------------------------------------------
    */

    const formData = await request.formData();

    /*
    |--------------------------------------------------------------------------
    | IMPORTANT
    |--------------------------------------------------------------------------
    |
    | getAll() is required for multi-file upload.
    |
    | Frontend sends:
    |
    | files = file1
    | files = file2
    | files = file3
    |
    |--------------------------------------------------------------------------
    */

    const files = formData.getAll("files");

    /*
    |--------------------------------------------------------------------------
    | Field information
    |--------------------------------------------------------------------------
    */

    const fieldType = normalizeFieldType(formData.get("fieldType"));

    const fieldSlug = String(formData.get("fieldSlug") || "");

    /*
    |--------------------------------------------------------------------------
    | No files
    |--------------------------------------------------------------------------
    */

    if (!files.length) {
      return NextResponse.json(
        {
          success: false,
          message: "No files selected.",
        },
        {
          status: 400,
        },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Check image field
    |--------------------------------------------------------------------------
    */

    const imageField =
      fieldType === "image" ||
      fieldType === "multi_image" ||
      fieldType === "multiimage";

    /*
    |--------------------------------------------------------------------------
    | Check multiple field
    |--------------------------------------------------------------------------
    */

    const multipleField =
      fieldType === "multi_file" ||
      fieldType === "multi_image" ||
      fieldType === "multifile" ||
      fieldType === "multiimage";

    /*
    |--------------------------------------------------------------------------
    | Upload directory
    |--------------------------------------------------------------------------
    */

    const uploadDirectory = path.join(
      process.cwd(),
      "public",
      "uploads",
      "custom-fields",
    );

    await mkdir(uploadDirectory, {
      recursive: true,
    });

    /*
    |--------------------------------------------------------------------------
    | Validate ALL files before saving ANY file
    |--------------------------------------------------------------------------
    |
    | This prevents:
    |
    | file1 -> saved
    | file2 -> saved
    | file3 -> invalid
    |
    | from leaving file1/file2 on disk while returning an error.
    |
    |--------------------------------------------------------------------------
    */

    const validFiles = [];

    for (const file of files) {
      /*
      |--------------------------------------------------------------------------
      | Check File object
      |--------------------------------------------------------------------------
      */

      if (!file || typeof file.arrayBuffer !== "function") {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid file received.",
          },
          {
            status: 400,
          },
        );
      }

      /*
      |--------------------------------------------------------------------------
      | File size
      |--------------------------------------------------------------------------
      */

      if (file.size <= 0) {
        return NextResponse.json(
          {
            success: false,
            message: `${file.name} is empty.`,
          },
          {
            status: 400,
          },
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            success: false,
            message: `${file.name} is larger than 10 MB.`,
          },
          {
            status: 400,
          },
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Image validation
      |--------------------------------------------------------------------------
      */

      if (imageField && !IMAGE_TYPES.includes(file.type)) {
        return NextResponse.json(
          {
            success: false,
            message: `${file.name} is not a valid image.`,
          },
          {
            status: 400,
          },
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Extension validation
      |--------------------------------------------------------------------------
      */

      const extension = getSafeExtension(file.name);

      if (extension === null) {
        return NextResponse.json(
          {
            success: false,
            message: `${file.name} is not an allowed file type.`,
          },
          {
            status: 400,
          },
        );
      }

      validFiles.push({
        file,
        extension,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | For single file field only use first file
    |--------------------------------------------------------------------------
    */

    const filesToUpload = multipleField ? validFiles : validFiles.slice(0, 1);

    /*
    |--------------------------------------------------------------------------
    | Save files
    |--------------------------------------------------------------------------
    */

    for (const item of filesToUpload) {
      const { file, extension } = item;

      /*
      |--------------------------------------------------------------------------
      | Original filename without extension
      |--------------------------------------------------------------------------
      */

      const baseName = path.basename(file.name, extension);

      const safeBaseName = sanitizeFileName(baseName) || "file";

      /*
      |--------------------------------------------------------------------------
      | Unique filename
      |--------------------------------------------------------------------------
      */

      const uniqueName = `${safeBaseName}-${Date.now()}-${crypto
        .randomBytes(5)
        .toString("hex")}${extension}`;

      /*
      |--------------------------------------------------------------------------
      | Physical file path
      |--------------------------------------------------------------------------
      */

      const filePath = path.join(uploadDirectory, uniqueName);

      /*
      |--------------------------------------------------------------------------
      | Convert File to Buffer
      |--------------------------------------------------------------------------
      */

      const buffer = Buffer.from(await file.arrayBuffer());

      /*
      |--------------------------------------------------------------------------
      | Write file
      |--------------------------------------------------------------------------
      */

      await writeFile(filePath, buffer);

      /*
      |--------------------------------------------------------------------------
      | Store for cleanup if another
      | operation fails
      |--------------------------------------------------------------------------
      */

      savedFiles.push(filePath);

      /*
      |--------------------------------------------------------------------------
      | Public URL
      |--------------------------------------------------------------------------
      */

      const fileUrl = `/uploads/custom-fields/${uniqueName}`;

      /*
      |--------------------------------------------------------------------------
      | Add response
      |--------------------------------------------------------------------------
      */

      savedFiles.push({
        response: {
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size,
          url: fileUrl,
        },
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Extract response files
    |--------------------------------------------------------------------------
    */

    const uploadedFiles = savedFiles
      .filter((item) => item?.response)
      .map((item) => item.response);

    /*
    |--------------------------------------------------------------------------
    | No files uploaded
    |--------------------------------------------------------------------------
    */

    if (!uploadedFiles.length) {
      return NextResponse.json(
        {
          success: false,
          message: "No valid files were uploaded.",
        },
        {
          status: 400,
        },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Success
    |--------------------------------------------------------------------------
    */

    console.log("Uploaded files:", uploadedFiles);

    return NextResponse.json({
      success: true,

      message: `${uploadedFiles.length} file(s) uploaded successfully.`,

      files: uploadedFiles,
    });
  } catch (error) {
    /*
    |--------------------------------------------------------------------------
    | Cleanup uploaded files if an error happens
    |--------------------------------------------------------------------------
    */

    for (const item of savedFiles) {
      if (typeof item === "string") {
        try {
          await unlink(item);
        } catch {
          // Ignore cleanup errors
        }
      }
    }

    console.error("CUSTOM FIELD UPLOAD ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to upload files.",
      },
      {
        status: 500,
      },
    );
  }
}