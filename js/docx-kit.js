/* 生成 .docx：手写 WordprocessingML，再装进 zip。不引第三方库，也不联网。
   支持标题、正文、项目符号、引用、表格、图片与分页。 */

import { xmlEscape, zip } from './zip-kit.js';

const EMU_PER_PX = 9525; /* 96dpi 下 1px = 9525 EMU */
const TWIP_PER_PT = 20;

function run(text, { bold = false, italic = false, size = 0, color = '' } = {}) {
  const props = [];
  if (bold) props.push('<w:b/>');
  if (italic) props.push('<w:i/>');
  if (size) props.push(`<w:sz w:val="${Math.round(size * 2)}"/><w:szCs w:val="${Math.round(size * 2)}"/>`);
  if (color) props.push(`<w:color w:val="${color.replace('#', '')}"/>`);
  const pPr = props.length ? `<w:rPr>${props.join('')}</w:rPr>` : '';
  return `<w:r>${pPr}<w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r>`;
}

function paragraph(content, { style = '', align = '', spaceBefore = 0, spaceAfter = 0, lineHeight = 0, indent = 0 } = {}) {
  const props = [];
  if (style) props.push(`<w:pStyle w:val="${style}"/>`);
  if (indent) props.push(`<w:ind w:left="${indent * TWIP_PER_PT}"/>`);
  if (spaceBefore) props.push(`<w:spacing w:before="${Math.round(spaceBefore * TWIP_PER_PT)}"/>`);
  if (spaceAfter) props.push(`<w:spacing w:after="${Math.round(spaceAfter * TWIP_PER_PT)}"/>`);
  if (lineHeight) props.push(`<w:spacing w:line="${Math.round(lineHeight * 240)}" w:lineRule="auto"/>`);
  if (align) props.push(`<w:jc w:val="${align}"/>`);
  const pPr = props.length ? `<w:pPr>${props.join('')}</w:pPr>` : '';
  return `<w:p>${pPr}${content}</w:p>`;
}

function tableXml(rows) {
  if (!rows.length) return '';
  const cols = Math.max(...rows.map((row) => row.length));
  const grid = Array.from({ length: cols }, () => '<w:gridCol w:w="2400"/>').join('');
  const body = rows
    .map((row) => {
      const cells = [];
      for (let i = 0; i < cols; i += 1) {
        const value = row[i] ?? '';
        cells.push(
          `<w:tc><w:tcPr><w:tcW w:w="2400" w:type="dxa"/></w:tcPr>${paragraph(value ? run(String(value), { size: 10.5 }) : '', { spaceAfter: 1 })}</w:tc>`,
        );
      }
      return `<w:tr>${cells.join('')}</w:tr>`;
    })
    .join('');
  return `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="BFBFBF"/><w:left w:val="single" w:sz="4" w:color="BFBFBF"/><w:bottom w:val="single" w:sz="4" w:color="BFBFBF"/><w:right w:val="single" w:sz="4" w:color="BFBFBF"/><w:insideH w:val="single" w:sz="4" w:color="BFBFBF"/><w:insideV w:val="single" w:sz="4" w:color="BFBFBF"/></w:tblBorders></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${body}</w:tbl>${paragraph('', { spaceAfter: 6 })}`;
}

function imageXml(relId, id, pxWidth, pxHeight) {
  const cx = Math.round(pxWidth * EMU_PER_PX);
  const cy = Math.round(pxHeight * EMU_PER_PX);
  return `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="Picture ${id}"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="image${id}.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="宋体" w:cs="Times New Roman"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:before="0" w:after="240"/></w:pPr><w:rPr><w:b/><w:sz w:val="48"/><w:szCs w:val="48"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="360" w:after="160" w:line="270" w:lineRule="auto"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="36"/><w:szCs w:val="36"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="280" w:after="140" w:line="270" w:lineRule="auto"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="220" w:after="120"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="480"/><w:spacing w:before="120" w:after="120"/></w:pPr><w:rPr><w:i/><w:color w:val="555555"/></w:rPr></w:style>
<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:color="BFBFBF"/><w:left w:val="single" w:sz="4" w:color="BFBFBF"/><w:bottom w:val="single" w:sz="4" w:color="BFBFBF"/><w:right w:val="single" w:sz="4" w:color="BFBFBF"/><w:insideH w:val="single" w:sz="4" w:color="BFBFBF"/><w:insideV w:val="single" w:sz="4" w:color="BFBFBF"/></w:tblBorders></w:tblPr></w:style>
</w:styles>`;

/** blocks: [{type, text, level, rows, data, width, height}] → Blob(.docx) */
export async function buildDocx(blocks, { title = '' } = {}) {
  const media = [];
  const body = [];
  let imageId = 0;

  for (const block of blocks) {
    switch (block.type) {
      case 'title':
        body.push(paragraph(run(block.text, { bold: true, size: 24 }), { style: 'Title' }));
        break;
      case 'h1':
      case 'h2':
      case 'h3':
        body.push(paragraph(run(block.text, { bold: true }), { style: block.type.toUpperCase().replace('H', 'Heading') }));
        break;
      case 'li':
        body.push(paragraph(run('• ' + block.text, { size: 10.5 }), { indent: 12, spaceAfter: 40 }));
        break;
      case 'quote':
        body.push(paragraph(run(block.text, { italic: true }), { style: 'Quote' }));
        break;
      case 'table':
        body.push(tableXml(block.rows || []));
        break;
      case 'pagebreak':
        body.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
        break;
      case 'img': {
        imageId += 1;
        media.push({ id: imageId, data: block.data });
        body.push(imageXml(`rIdImg${imageId}`, 100 + imageId, block.width || 600, block.height || 800));
        break;
      }
      default:
        if (block.text) body.push(paragraph(run(block.text, { size: 11 }), { spaceAfter: 120 }));
    }
  }

  const sectPr = `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1418" w:right="1418" w:bottom="1418" w:left="1418" w:header="851" w:footer="992" w:gutter="0"/></w:sectPr>`;
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${body.join('')}${sectPr}</w:body></w:document>`;

  const rels = [
    '<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>',
    ...media.map(
      (item) =>
        `<Relationship Id="rIdImg${item.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image${item.id}.png"/>`,
    ),
  ].join('');

  const files = [
    {
      name: '[Content_Types].xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`,
    },
    {
      name: '_rels/.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    },
    { name: 'word/document.xml', data: document },
    { name: 'word/styles.xml', data: STYLES },
    {
      name: 'word/_rels/document.xml.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`,
    },
    ...media.map((item) => ({ name: `word/media/image${item.id}.png`, data: item.data })),
  ];

  if (title) {
    files.push({
      name: 'docProps/core.xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${xmlEscape(title)}</dc:title></cp:coreProperties>`,
    });
  }

  const blob = await zip(files);
  return new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}
