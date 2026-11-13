"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Separator } from "@/components/ui/separator";

import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo2,
  Redo2,
  Link,
  Unlink,
  RemoveFormatting,
  Code,
  Eye,
  Plus,
  Download,
  Printer,
  FilePlus,
  Image as ImageIcon,
  Minus,
  Table as TableIcon,
  Rows3,
  Columns3,
  Type,
} from "lucide-react";

const EmailTemplateEditor = ({
  value = "",
  onChange,
  disabled = false,
  placeholder = "Write your email message...",
  onFocus,
  onMergeField,
}) => {
  const editorRef = useRef(null);
  const savedSelectionRef = useRef(null);

  const [viewMode, setViewMode] = useState("editor");
  const [sourceValue, setSourceValue] = useState(value || "");
  const [wordCount, setWordCount] = useState(0);

  /*
   * =====================================================
   * SET INITIAL HTML
   * =====================================================
   */

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }

    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }

    setSourceValue(value || "");
    updateWordCount(value || "");
  }, [value]);

  /*
   * =====================================================
   * WORD COUNT
   * =====================================================
   */

  const updateWordCount = (html) => {
    if (!html) {
      setWordCount(0);
      return;
    }

    const temp = document.createElement("div");
    temp.innerHTML = html;

    const text = temp.textContent || temp.innerText || "";

    const words = text.trim().split(/\s+/).filter(Boolean);

    setWordCount(words.length);
  };

  /*
   * =====================================================
   * SAVE SELECTION
   * =====================================================
   */

  const saveSelection = () => {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);

    if (
      editorRef.current &&
      editorRef.current.contains(range.commonAncestorContainer)
    ) {
      savedSelectionRef.current = range.cloneRange();
    }
  };

  /*
   * =====================================================
   * RESTORE SELECTION
   * =====================================================
   */

  const restoreSelection = () => {
    const selection = window.getSelection();

    if (!selection || !savedSelectionRef.current) {
      return;
    }

    try {
      selection.removeAllRanges();
      selection.addRange(savedSelectionRef.current);
    } catch (error) {
      console.error("Unable to restore selection:", error);
    }
  };

  /*
   * =====================================================
   * UPDATE EDITOR
   * =====================================================
   */

  const updateEditorValue = () => {
    if (!editorRef.current) {
      return;
    }

    const html = editorRef.current.innerHTML;

    setSourceValue(html);
    updateWordCount(html);

    onChange?.(html);
  };

  /*
   * =====================================================
   * EXECUTE COMMAND
   * =====================================================
   */

  const formatText = (command, commandValue = null) => {
    if (disabled || !editorRef.current) {
      return;
    }

    editorRef.current.focus();

    restoreSelection();

    document.execCommand(command, false, commandValue);

    updateEditorValue();

    saveSelection();
  };

  /*
   * =====================================================
   * HANDLE INPUT
   * =====================================================
   */

  const handleInput = () => {
    updateEditorValue();
    saveSelection();
  };

  /*
   * =====================================================
   * FONT
   * =====================================================
   */

  const handleFontChange = (font) => {
    formatText("fontName", font);
  };

  /*
   * =====================================================
   * FONT SIZE
   * =====================================================
   */

  const handleFontSizeChange = (size) => {
    formatText("fontSize", size);
  };

  /*
   * =====================================================
   * TEXT COLOR
   * =====================================================
   */

  const handleTextColor = (event) => {
    formatText("foreColor", event.target.value);
  };

  /*
   * =====================================================
   * BACKGROUND COLOR
   * =====================================================
   */

  const handleBackgroundColor = (event) => {
    formatText("hiliteColor", event.target.value);
  };

  /*
   * =====================================================
   * LINK
   * =====================================================
   */

  const handleLink = () => {
    if (disabled) {
      return;
    }

    const url = window.prompt("Enter URL");

    if (!url) {
      return;
    }

    editorRef.current?.focus();

    restoreSelection();

    document.execCommand("createLink", false, url);

    updateEditorValue();
    saveSelection();
  };

  /*
   * =====================================================
   * IMAGE
   * =====================================================
   */

  const handleImage = () => {
    if (disabled) {
      return;
    }

    const url = window.prompt("Enter image URL");

    if (!url) {
      return;
    }

    editorRef.current?.focus();

    restoreSelection();

    document.execCommand("insertImage", false, url);

    updateEditorValue();
    saveSelection();
  };

  /*
   * =====================================================
   * HORIZONTAL LINE
   * =====================================================
   */

  const handleHorizontalLine = () => {
    if (disabled || !editorRef.current) {
      return;
    }

    editorRef.current.focus();

    restoreSelection();

    document.execCommand("insertHorizontalRule", false, null);

    updateEditorValue();
    saveSelection();
  };

  /*
   * =====================================================
   * INSERT TABLE
   * =====================================================
   */

  const handleInsertTable = () => {
    if (disabled || !editorRef.current) {
      return;
    }

    const rowsInput = window.prompt("Number of rows", "3");
    const columnsInput = window.prompt("Number of columns", "3");

    if (!rowsInput || !columnsInput) {
      return;
    }

    const rows = parseInt(rowsInput, 10);
    const columns = parseInt(columnsInput, 10);

    if (
      Number.isNaN(rows) ||
      Number.isNaN(columns) ||
      rows < 1 ||
      columns < 1 ||
      rows > 20 ||
      columns > 20
    ) {
      window.alert("Please enter rows and columns between 1 and 20.");
      return;
    }

    let tableHTML = `
      <table
        style="
          width: 100%;
          border-collapse: collapse;
          margin: 10px 0;
        "
      >
        <tbody>
    `;

    for (let row = 0; row < rows; row++) {
      tableHTML += "<tr>";

      for (let column = 0; column < columns; column++) {
        tableHTML += `
          <td
            style="
              border: 1px solid #d1d5db;
              padding: 8px;
              min-width: 80px;
            "
          >
            &nbsp;
          </td>
        `;
      }

      tableHTML += "</tr>";
    }

    tableHTML += `
        </tbody>
      </table>
      <p><br></p>
    `;

    editorRef.current.focus();

    restoreSelection();

    document.execCommand("insertHTML", false, tableHTML);

    updateEditorValue();
    saveSelection();
  };

  /*
   * =====================================================
   * ADD TABLE ROW
   * =====================================================
   */

  const handleAddTableRow = () => {
    if (disabled || !editorRef.current) {
      return;
    }

    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) {
      window.alert("Place your cursor inside a table first.");
      return;
    }

    let node = selection.anchorNode;

    if (node?.nodeType === Node.TEXT_NODE) {
      node = node.parentElement;
    }

    const table = node?.closest?.("table");

    if (!table) {
      window.alert("Place your cursor inside a table first.");
      return;
    }

    const firstRow = table.querySelector("tr");

    if (!firstRow) {
      return;
    }

    const columnCount = firstRow.children.length;

    const row = document.createElement("tr");

    for (let i = 0; i < columnCount; i++) {
      const cell = document.createElement("td");

      cell.innerHTML = "&nbsp;";

      cell.style.border = "1px solid #d1d5db";
      cell.style.padding = "8px";
      cell.style.minWidth = "80px";

      row.appendChild(cell);
    }

    table.querySelector("tbody")?.appendChild(row);

    updateEditorValue();
  };

  /*
   * =====================================================
   * ADD TABLE COLUMN
   * =====================================================
   */

  const handleAddTableColumn = () => {
    if (disabled || !editorRef.current) {
      return;
    }

    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) {
      window.alert("Place your cursor inside a table first.");
      return;
    }

    let node = selection.anchorNode;

    if (node?.nodeType === Node.TEXT_NODE) {
      node = node.parentElement;
    }

    const table = node?.closest?.("table");

    if (!table) {
      window.alert("Place your cursor inside a table first.");
      return;
    }

    const rows = table.querySelectorAll("tr");

    rows.forEach((row) => {
      const cell = document.createElement("td");

      cell.innerHTML = "&nbsp;";

      cell.style.border = "1px solid #d1d5db";
      cell.style.padding = "8px";
      cell.style.minWidth = "80px";

      row.appendChild(cell);
    });

    updateEditorValue();
  };

  /*
   * =====================================================
   * NEW DOCUMENT
   * =====================================================
   */

  const handleNewDocument = () => {
    if (disabled) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to clear the editor?",
    );

    if (!confirmed) {
      return;
    }

    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }

    setSourceValue("");
    updateWordCount("");

    onChange?.("");
  };

  /*
   * =====================================================
   * DOWNLOAD HTML
   * =====================================================
   */

  const handleDownload = () => {
    const html =
      viewMode === "source" ? sourceValue : editorRef.current?.innerHTML || "";

    const blob = new Blob([html], {
      type: "text/html;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "email-template.html";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  /*
   * =====================================================
   * PRINT
   * =====================================================
   */

  const handlePrint = () => {
    const html =
      viewMode === "source" ? sourceValue : editorRef.current?.innerHTML || "";

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Email Template Preview</title>

          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 30px;
              line-height: 1.6;
            }

            table {
              border-collapse: collapse;
              max-width: 100%;
            }

            td,
            th {
              border: 1px solid #d1d5db;
              padding: 8px;
            }

            img {
              max-width: 100%;
            }
          </style>
        </head>

        <body>
          ${html}
        </body>
      </html>
    `);

    printWindow.document.close();

    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  /*
   * =====================================================
   * SOURCE MODE
   * =====================================================
   */

  const openSourceMode = () => {
    if (disabled) {
      return;
    }

    const html = editorRef.current?.innerHTML || value || "";

    setSourceValue(html);
    setViewMode("source");
  };

  /*
   * =====================================================
   * APPLY SOURCE
   * =====================================================
   */

  const applySourceValue = (html) => {
    setSourceValue(html);

    if (editorRef.current) {
      editorRef.current.innerHTML = html;
    }

    updateWordCount(html);

    onChange?.(html);
  };

  /*
   * =====================================================
   * EDITOR MODE
   * =====================================================
   */

  const openEditorMode = () => {
    if (editorRef.current) {
      editorRef.current.innerHTML = sourceValue;
    }

    onChange?.(sourceValue);

    setViewMode("editor");
  };

  /*
   * =====================================================
   * PREVIEW MODE
   * =====================================================
   */

  const openPreviewMode = () => {
    const html = editorRef.current?.innerHTML || sourceValue || value || "";

    setSourceValue(html);
    setViewMode("preview");
  };

  /*
   * =====================================================
   * SELECT ALL
   * =====================================================
   */

  const handleSelectAll = () => {
    if (!editorRef.current || disabled) {
      return;
    }

    editorRef.current.focus();

    const selection = window.getSelection();
    const range = document.createRange();

    range.selectNodeContents(editorRef.current);

    selection.removeAllRanges();
    selection.addRange(range);

    savedSelectionRef.current = range.cloneRange();
  };

  /*
   * =====================================================
   * MERGE FIELD
   * =====================================================
   */

  const insertMergeField = (field) => {
    if (!editorRef.current || disabled) {
      return;
    }

    editorRef.current.focus();

    restoreSelection();

    const selection = window.getSelection();

    if (!selection) {
      return;
    }

    /*
     * If there is no saved selection,
     * put cursor at the end.
     */

    if (!savedSelectionRef.current) {
      const range = document.createRange();

      range.selectNodeContents(editorRef.current);
      range.collapse(false);

      selection.removeAllRanges();
      selection.addRange(range);
    }

    const range = selection.getRangeAt(0);

    const textNode = document.createTextNode(field);

    range.deleteContents();
    range.insertNode(textNode);

    range.setStartAfter(textNode);
    range.collapse(true);

    selection.removeAllRanges();
    selection.addRange(range);

    savedSelectionRef.current = range.cloneRange();

    updateEditorValue();

    if (onMergeField) {
      onMergeField(field);
    }
  };

  /*
   * =====================================================
   * TOOLBAR BUTTON
   * =====================================================
   */

  const ToolbarButton = ({
    icon: Icon,
    command,
    title,
    value: commandValue = null,
    className = "",
  }) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={disabled}
      title={title}
      className={`h-8 w-8 p-0 ${className}`}
      onMouseDown={(event) => {
        event.preventDefault();
        saveSelection();
      }}
      onClick={() => formatText(command, commandValue)}
    >
      <Icon className="size-4" />
    </Button>
  );

  /*
   * =====================================================
   * MENU BUTTON
   * =====================================================
   */

  const MenuButton = ({ icon: Icon, children, onClick }) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={disabled}
      className="h-8 px-3 text-xs font-medium"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {Icon && <Icon className="mr-1.5 size-3.5" />}
      {children}
    </Button>
  );

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-background ${
        disabled ? "opacity-60" : ""
      }`}
    >
      {/* =================================================
          MENU BAR
      ================================================= */}

      <div className="flex flex-wrap items-center gap-1 border-b bg-muted/20 px-2 py-1">
        <MenuButton icon={FilePlus} onClick={handleNewDocument}>
          New
        </MenuButton>

        <MenuButton icon={Undo2} onClick={() => formatText("undo")}>
          Undo
        </MenuButton>

        <MenuButton icon={Redo2} onClick={() => formatText("redo")}>
          Redo
        </MenuButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <MenuButton icon={Code} onClick={openSourceMode}>
          Source
        </MenuButton>

        <MenuButton icon={Eye} onClick={openPreviewMode}>
          Preview
        </MenuButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <MenuButton icon={Link} onClick={handleLink}>
          Link
        </MenuButton>

        <MenuButton icon={ImageIcon} onClick={handleImage}>
          Image
        </MenuButton>

        <MenuButton icon={TableIcon} onClick={handleInsertTable}>
          Table
        </MenuButton>

        <MenuButton icon={Download} onClick={handleDownload}>
          Download
        </MenuButton>

        <MenuButton icon={Printer} onClick={handlePrint}>
          Print
        </MenuButton>
      </div>

      {/* =================================================
          VIEW MODE BAR
      ================================================= */}

      {viewMode !== "editor" && (
        <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
          <div className="flex items-center gap-2">
            {viewMode === "source" ? (
              <>
                <Code className="size-4" />

                <span className="text-sm font-medium">HTML Source</span>
              </>
            ) : (
              <>
                <Eye className="size-4" />

                <span className="text-sm font-medium">Email Preview</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {viewMode === "source" && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={openEditorMode}
              >
                Back to Editor
              </Button>
            )}

            {viewMode === "preview" && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={openEditorMode}
              >
                Edit
              </Button>
            )}
          </div>
        </div>
      )}

      {/* =================================================
          FORMATTING TOOLBAR
      ================================================= */}

      {viewMode === "editor" && (
        <div className="flex flex-wrap items-center gap-1 border-b bg-background p-2">
          <Select
            defaultValue="Arial"
            onValueChange={handleFontChange}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="Arial">Arial</SelectItem>

              <SelectItem value="Helvetica">Helvetica</SelectItem>

              <SelectItem value="Verdana">Verdana</SelectItem>

              <SelectItem value="Tahoma">Tahoma</SelectItem>

              <SelectItem value="Georgia">Georgia</SelectItem>

              <SelectItem value="Times New Roman">Times New Roman</SelectItem>
            </SelectContent>
          </Select>

          <Select
            defaultValue="3"
            onValueChange={handleFontSizeChange}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 w-[80px] text-xs">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="1">8pt</SelectItem>

              <SelectItem value="2">10pt</SelectItem>

              <SelectItem value="3">12pt</SelectItem>

              <SelectItem value="4">14pt</SelectItem>

              <SelectItem value="5">18pt</SelectItem>

              <SelectItem value="6">24pt</SelectItem>

              <SelectItem value="7">36pt</SelectItem>
            </SelectContent>
          </Select>

          <Separator orientation="vertical" className="mx-1 h-6" />

          <ToolbarButton icon={Bold} command="bold" title="Bold" />

          <ToolbarButton icon={Italic} command="italic" title="Italic" />

          <ToolbarButton
            icon={Underline}
            command="underline"
            title="Underline"
          />

          <ToolbarButton
            icon={Strikethrough}
            command="strikeThrough"
            title="Strikethrough"
          />

          <Separator orientation="vertical" className="mx-1 h-6" />

          <ToolbarButton
            icon={List}
            command="insertUnorderedList"
            title="Bullet list"
          />

          <ToolbarButton
            icon={ListOrdered}
            command="insertOrderedList"
            title="Numbered list"
          />

          <Separator orientation="vertical" className="mx-1 h-6" />

          <ToolbarButton
            icon={AlignLeft}
            command="justifyLeft"
            title="Align left"
          />

          <ToolbarButton
            icon={AlignCenter}
            command="justifyCenter"
            title="Align center"
          />

          <ToolbarButton
            icon={AlignRight}
            command="justifyRight"
            title="Align right"
          />

          <ToolbarButton
            icon={AlignJustify}
            command="justifyFull"
            title="Justify"
          />

          <Separator orientation="vertical" className="mx-1 h-6" />

          <ToolbarButton icon={Undo2} command="undo" title="Undo" />

          <ToolbarButton icon={Redo2} command="redo" title="Redo" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Insert link"
            disabled={disabled}
            onMouseDown={(event) => {
              event.preventDefault();
              saveSelection();
            }}
            onClick={handleLink}
          >
            <Link className="size-4" />
          </Button>

          <ToolbarButton icon={Unlink} command="unlink" title="Remove link" />

          <ToolbarButton
            icon={RemoveFormatting}
            command="removeFormat"
            title="Clear formatting"
          />

          <Separator orientation="vertical" className="mx-1 h-6" />

          <input
            type="color"
            defaultValue="#000000"
            onChange={handleTextColor}
            disabled={disabled}
            title="Text color"
            className="h-8 w-9 cursor-pointer rounded-md border bg-background p-1"
          />

          <input
            type="color"
            defaultValue="#ffff00"
            onChange={handleBackgroundColor}
            disabled={disabled}
            title="Background color"
            className="h-8 w-9 cursor-pointer rounded-md border bg-background p-1"
          />

          <Separator orientation="vertical" className="mx-1 h-6" />

          {/* TABLE ACTIONS */}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Insert table"
            disabled={disabled}
            onMouseDown={(event) => {
              event.preventDefault();
              saveSelection();
            }}
            onClick={handleInsertTable}
          >
            <TableIcon className="size-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Add table row"
            disabled={disabled}
            onClick={handleAddTableRow}
          >
            <Rows3 className="size-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Add table column"
            disabled={disabled}
            onClick={handleAddTableColumn}
          >
            <Columns3 className="size-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Horizontal line"
            disabled={disabled}
            onMouseDown={(event) => {
              event.preventDefault();
              saveSelection();
            }}
            onClick={handleHorizontalLine}
          >
            <Minus className="size-4" />
          </Button>
        </div>
      )}

      {/* =================================================
          EDITOR
      ================================================= */}

      {viewMode === "editor" && (
        <div className="relative">
          {!value && (
            <div className="pointer-events-none absolute left-4 top-4 z-10 text-sm text-muted-foreground">
              {placeholder}
            </div>
          )}

          <div
            ref={editorRef}
            contentEditable={!disabled}
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyUp={saveSelection}
            onMouseUp={saveSelection}
            onFocus={() => {
              saveSelection();

              if (onFocus) {
                onFocus();
              }
            }}
            onBlur={saveSelection}
            className="
              min-h-[360px]
              w-full
              overflow-auto
              bg-background
              px-4
              py-4
              text-sm
              leading-6
              outline-none
              focus:ring-0
              [&_a]:text-primary
              [&_a]:underline
              [&_ol]:ml-5
              [&_ol]:list-decimal
              [&_ul]:ml-5
              [&_ul]:list-disc
              [&_table]:w-full
              [&_table]:border-collapse
              [&_td]:border
              [&_td]:border-gray-300
              [&_td]:p-2
              [&_th]:border
              [&_th]:border-gray-300
              [&_th]:p-2
              [&_img]:max-w-full
            "
          />
        </div>
      )}

      {/* =================================================
          SOURCE EDITOR
      ================================================= */}

      {viewMode === "source" && (
        <textarea
          value={sourceValue}
          disabled={disabled}
          onChange={(event) => {
            applySourceValue(event.target.value);
          }}
          spellCheck={false}
          className="
            min-h-[360px]
            w-full
            resize-y
            bg-background
            px-4
            py-4
            font-mono
            text-xs
            leading-5
            outline-none
          "
          placeholder="<p>Write your HTML here...</p>"
        />
      )}

      {/* =================================================
          PREVIEW
      ================================================= */}

      {viewMode === "preview" && (
        <div className="min-h-[360px] bg-muted/20 p-6">
          <div className="mx-auto min-h-[300px] max-w-[900px] rounded-lg border bg-white p-6 shadow-sm">
            <div
              dangerouslySetInnerHTML={{
                __html: sourceValue,
              }}
              className="
                text-sm
                leading-6
                [&_a]:text-primary
                [&_a]:underline
                [&_ol]:ml-5
                [&_ol]:list-decimal
                [&_ul]:ml-5
                [&_ul]:list-disc
                [&_table]:w-full
                [&_table]:border-collapse
                [&_td]:border
                [&_td]:border-gray-300
                [&_td]:p-2
                [&_th]:border
                [&_th]:border-gray-300
                [&_th]:p-2
                [&_img]:max-w-full
              "
            />
          </div>
        </div>
      )}

      {/* =================================================
          FOOTER
      ================================================= */}

      <div className="flex h-8 items-center justify-between border-t bg-muted/20 px-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>
            {viewMode === "source"
              ? "HTML Source"
              : viewMode === "preview"
                ? "Email Preview"
                : "Rich Text Editor"}
          </span>

          <span>{wordCount} words</span>
        </div>

        <div className="flex items-center gap-3">
          {viewMode === "editor" && (
            <>
              <button
                type="button"
                onClick={handleSelectAll}
                disabled={disabled}
                className="flex items-center gap-1 hover:text-foreground"
              >
                <Type className="size-3" />
                Select All
              </button>

              <button
                type="button"
                onClick={() => {
                  const html = editorRef.current?.innerHTML || "";

                  setSourceValue(html);

                  setViewMode("source");
                }}
                disabled={disabled}
                className="flex items-center gap-1 hover:text-foreground"
              >
                <Code className="size-3" />
                Source
              </button>

              <button
                type="button"
                onClick={openPreviewMode}
                disabled={disabled}
                className="flex items-center gap-1 hover:text-foreground"
              >
                <Eye className="size-3" />
                Preview
              </button>
            </>
          )}

          {viewMode === "editor" && <span>HTML supported</span>}

          {viewMode === "source" && <span>HTML editing enabled</span>}

          {viewMode === "preview" && <span>Preview mode</span>}
        </div>
      </div>
    </div>
  );
};

export default EmailTemplateEditor;