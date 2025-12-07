export const NIVELES = ['Inicial', 'Primaria', 'Secundaria'];
export const GRADOS_PRIMARIA = ['1°', '2°', '3°', '4°', '5°', '6°'];
export const AREAS = ['Matemática', 'Comunicación', 'Personal Social', 'Ciencia y Tecnología', 'Arte y Cultura', 'Religión', 'Educación Física'];

export const LATEX_TEMPLATE = `\\documentclass[a4paper,11pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[spanish]{babel}
\\usepackage{geometry}
\\usepackage{tabularx}
\\usepackage{multirow}
\\usepackage{enumitem}
\\usepackage{array}
\\usepackage{graphicx}

\\geometry{left=2cm, right=2cm, top=2cm, bottom=2cm}

\\newcolumntype{L}{>{\\raggedright\\arraybackslash}X}
\\renewcommand{\\arraystretch}{1.4}

\\begin{document}

\\begin{center}
    \\textbf{\\Large [NOMBRE DE LA SESIÓN]}\\\\[0.2cm]
    \\textbf{\\textit{\\small SESIÓN DE APRENDIZAJE}}
\\end{center}

\\vspace{0.3cm}

\\noindent \\textbf{I. \\hspace{0.3cm} DATOS INFORMATIVOS:}

\\vspace{0.2cm}

\\noindent
\\begin{tabular}{ll}
    \\textbf{1.1 Área Curricular} & : [Área Curricular] \\\\
    \\textbf{1.2 Ciclo -- Grado}  & : [Ciclo -- Grado] \\\\
    \\textbf{1.3 Docente}         & : [Nombre del Docente] \\\\
\\end{tabular}

\\vspace{0.5cm}

\\noindent \\textbf{II. \\hspace{0.1cm} SECUENCIA DIDÁCTICA DE LA SESIÓN}

\\vspace{0.2cm}

\\noindent
\\begin{tabularx}{\\textwidth}{|p{2cm}|p{3cm}|L|p{3cm}|}
    \\hline
    \\multicolumn{2}{|c|}{\\textbf{Momentos}} & \\multicolumn{1}{c|}{\\textbf{Estrategias}} & \\multicolumn{1}{c|}{\\textbf{Materiales}} \\\\
    \\hline

    \\multirow{4}{*}{\\textbf{Inicio}} 
    & \\textbf{Motivación} 
    & [Estrategias de Motivación]
    & \\multirow{4}{*}{\\parbox{\\linewidth}{
        [Materiales]
    }} \\\\
    \\cline{2-3}

    & \\textbf{Saberes previos} 
    & [Saberes Previos]
    & \\\\ 
    \\cline{2-3}

    & \\textbf{Conflicto cognitivo} 
    & [Conflicto Cognitivo]
    & \\\\ 
    \\cline{2-3}

    & \\textbf{Propósito didáctico} 
    & [Propósito Didáctico]
    & \\\\ 
    \\hline

    \\multicolumn{2}{|l|}{\\textbf{Desarrollo}} 
    & [Estrategias de Desarrollo]
    & [Materiales] \\\\
    \\hline
    \\multicolumn{2}{|l|}{\\textbf{Cierre}} 
    & [Estrategias de Cierre]
    & [Materiales] \\\\
    \\hline

    \\multicolumn{2}{|l|}{\\textbf{Tarea o trabajo en casa}} 
    & [Tarea o Trabajo en Casa]
    & [Materiales] \\\\
    \\hline

\\end{tabularx}

\\end{document}`;