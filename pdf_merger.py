import os
import tkinter as tk
from tkinter import filedialog, messagebox
from tkinterdnd2 import DND_FILES, TkinterDnD
import customtkinter as ctk
from PyPDF2 import PdfMerger
from datetime import datetime
import subprocess
import platform

# --- Configuración ---
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

app = TkinterDnD.Tk()
app.title("Unir PDFs - Simple y Fácil")
app.geometry("900x750")
app.resizable(False, False)
app.configure(bg="#1a1a1a")

pdf_files = []
preview_window = None

# --- Importaciones pesadas lazy (solo cuando se necesiten) ---
def lazy_import_preview_libs():
    """Importa librerías pesadas solo cuando se usa la vista previa"""
    global Image, ImageTk, fitz, io
    if 'Image' not in globals():
        from PIL import Image, ImageTk
        import fitz  # PyMuPDF
        import io
    return Image, ImageTk, fitz, io

# --- Ventana de ayuda ---
def show_help():
    help_window = ctk.CTkToplevel(app)
    help_window.title("¿Cómo usar esta aplicación?")
    help_window.geometry("600x520")
    help_window.resizable(False, False)
    help_window.grab_set()
    
    help_window.update_idletasks()
    x = (help_window.winfo_screenwidth() // 2) - (600 // 2)
    y = (help_window.winfo_screenheight() // 2) - (520 // 2)
    help_window.geometry(f"+{x}+{y}")
    
    ctk.CTkLabel(
        help_window, 
        text="📖 Guía Rápida de Uso",
        font=ctk.CTkFont(size=24, weight="bold")
    ).pack(pady=20)
    
    help_text = """
    Esta aplicación une varios archivos PDF en uno solo.
    Es muy simple:

    PASO 1️⃣: Agregar tus PDFs
    • Haz clic en "Agregar PDFs" para elegir archivos
    • Haz clic en "Agregar Carpeta" para añadir todos 
      los PDFs de una carpeta
    • O simplemente ARRASTRA archivos o carpetas 
      directamente a la zona de la lista
    
    PASO 2️⃣: Ordenar (opcional)
    • Los archivos aparecerán en la lista central
    • Puedes arrastrarlos con el mouse para cambiar el orden
    • El orden de la lista será el orden en el PDF final
    • Haz doble clic en un archivo para ver su vista previa
    
    PASO 3️⃣: Dar un nombre
    • Escribe el nombre que quieres para tu PDF final
    • Si no escribes nada, se creará uno automáticamente
    
    PASO 4️⃣: Unir
    • Haz clic en el botón verde grande "UNIR PDFs AHORA"
    • ¡Listo! El archivo se guardará en la misma carpeta
      del programa
    
    💡 CONSEJOS:
    • Puedes eliminar archivos de la lista seleccionándolos
      y presionando "Eliminar Seleccionado"
    • Si te equivocas, usa "Limpiar Todo" para empezar de nuevo
    • El PDF se puede abrir automáticamente al terminar
    """
    
    text_widget = ctk.CTkTextbox(
        help_window,
        width=550,
        height=350,
        font=ctk.CTkFont(size=13),
        wrap="word"
    )
    text_widget.pack(pady=10, padx=20)
    text_widget.insert("1.0", help_text)
    text_widget.configure(state="disabled")
    
    ctk.CTkButton(
        help_window,
        text="Entendido",
        command=help_window.destroy,
        width=200,
        height=40,
        font=ctk.CTkFont(size=14, weight="bold")
    ).pack(pady=15)

# --- Vista previa (con lazy loading) ---
def show_preview(event):
    selection = listbox.curselection()
    if not selection:
        return
    
    index = selection[0]
    pdf_path = pdf_files[index]
    
    global preview_window
    if preview_window is not None:
        try:
            preview_window.destroy()
        except:
            pass
    
    # Cargar librerías pesadas solo ahora
    try:
        Image, ImageTk, fitz, io = lazy_import_preview_libs()
    except ImportError as e:
        messagebox.showerror(
            "Librerías faltantes",
            "Para usar la vista previa necesitas instalar:\npip install PyMuPDF Pillow"
        )
        return
    
    preview_window = ctk.CTkToplevel(app)
    preview_window.title(f"Vista Previa - {os.path.basename(pdf_path)}")
    preview_window.geometry("600x750")
    preview_window.attributes('-topmost', True)
    preview_window.focus_force()
    
    preview_window.update_idletasks()
    x = (preview_window.winfo_screenwidth() // 2) - (600 // 2)
    y = (preview_window.winfo_screenheight() // 2) - (750 // 2)
    preview_window.geometry(f"+{x}+{y}")
    
    try:
        doc = fitz.open(pdf_path)
        page_count = len(doc)
        
        # Header
        header = ctk.CTkFrame(preview_window)
        header.pack(fill="x", padx=10, pady=10)
        
        ctk.CTkLabel(
            header,
            text=f"📄 {os.path.basename(pdf_path)}",
            font=ctk.CTkFont(size=16, weight="bold")
        ).pack(side="left", padx=10)
        
        ctk.CTkLabel(
            header,
            text=f"Total: {page_count} página(s)",
            font=ctk.CTkFont(size=12)
        ).pack(side="right", padx=10)
        
        # Canvas para preview
        canvas_frame = ctk.CTkFrame(preview_window)
        canvas_frame.pack(fill="both", expand=True, padx=10, pady=5)
        
        canvas = tk.Canvas(canvas_frame, bg="#2b2b2b", highlightthickness=0)
        scrollbar = tk.Scrollbar(canvas_frame, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg="#2b2b2b")
        
        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
        # Mostrar primeras 3 páginas
        max_pages = min(3, page_count)
        for page_num in range(max_pages):
            page = doc[page_num]
            pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5))
            img_data = pix.tobytes("ppm")
            img = Image.open(io.BytesIO(img_data))
            
            # Redimensionar si es muy grande
            max_width = 550
            if img.width > max_width:
                ratio = max_width / img.width
                new_size = (max_width, int(img.height * ratio))
                img = img.resize(new_size, Image.Resampling.LANCZOS)
            
            photo = ImageTk.PhotoImage(img)
            
            page_frame = tk.Frame(scrollable_frame, bg="#2b2b2b")
            page_frame.pack(pady=10)
            
            tk.Label(
                page_frame,
                text=f"Página {page_num + 1}",
                bg="#2b2b2b",
                fg="white",
                font=("Segoe UI", 11, "bold")
            ).pack()
            
            label = tk.Label(page_frame, image=photo, bg="#2b2b2b")
            label.image = photo
            label.pack(pady=5)
        
        if page_count > 3:
            tk.Label(
                scrollable_frame,
                text=f"... y {page_count - 3} página(s) más",
                bg="#2b2b2b",
                fg="gray",
                font=("Segoe UI", 11)
            ).pack(pady=20)
        
        doc.close()
        
    except Exception as e:
        messagebox.showerror("Error", f"No se pudo mostrar la vista previa:\n{str(e)}")
        if preview_window:
            preview_window.destroy()

# --- Drag and Drop ---
def drop_files(event):
    files = app.tk.splitlist(event.data)
    count = 0
    
    for item in files:
        item = item.strip('{}')
        
        if os.path.isdir(item):
            pdf_list = sorted([f for f in os.listdir(item) if f.lower().endswith(".pdf")])
            for file in pdf_list:
                full_path = os.path.join(item, file)
                if full_path not in pdf_files:
                    pdf_files.append(full_path)
                    listbox.insert(tk.END, file)
                    count += 1
        
        elif item.lower().endswith(".pdf") and os.path.isfile(item):
            if item not in pdf_files:
                pdf_files.append(item)
                listbox.insert(tk.END, os.path.basename(item))
                count += 1
    
    if count > 0:
        update_counter()
        update_output_name()
        status_label.configure(text=f"✅ {count} archivo(s) agregado(s) por arrastrar", text_color="#00b894")

# --- Funciones principales ---
def add_pdfs():
    files = filedialog.askopenfilenames(
        title="Selecciona los archivos PDF",
        filetypes=[("Archivos PDF", "*.pdf"), ("Todos los archivos", "*.*")]
    )
    if files:
        count = 0
        for file in files:
            if file not in pdf_files:
                pdf_files.append(file)
                listbox.insert(tk.END, os.path.basename(file))
                count += 1
        if count > 0:
            update_counter()
            update_output_name()
            status_label.configure(text=f"✅ {count} archivo(s) agregado(s)", text_color="#00b894")

def add_folder():
    folder = filedialog.askdirectory(title="Selecciona una carpeta con PDFs")
    if folder:
        count = 0
        pdf_list = sorted([f for f in os.listdir(folder) if f.lower().endswith(".pdf")])
        
        if not pdf_list:
            messagebox.showinfo("Sin PDFs", "No se encontraron archivos PDF en esta carpeta.")
            return
            
        for file in pdf_list:
            full_path = os.path.join(folder, file)
            if full_path not in pdf_files:
                pdf_files.append(full_path)
                listbox.insert(tk.END, file)
                count += 1
        
        if count > 0:
            update_counter()
            update_output_name()
            status_label.configure(text=f"✅ {count} archivo(s) agregado(s) desde la carpeta", text_color="#00b894")

def remove_selected():
    selection = listbox.curselection()
    if not selection:
        messagebox.showinfo("Atención", "Selecciona un archivo de la lista para eliminar.")
        return
    
    index = selection[0]
    listbox.delete(index)
    pdf_files.pop(index)
    update_counter()
    status_label.configure(text="🗑️ Archivo eliminado", text_color="#fdcb6e")

def clear_list():
    if not pdf_files:
        return
    
    result = messagebox.askyesno(
        "Confirmar", 
        "¿Estás seguro de que quieres limpiar toda la lista?"
    )
    if result:
        pdf_files.clear()
        listbox.delete(0, tk.END)
        output_name_entry.delete(0, tk.END)
        update_counter()
        status_label.configure(text="🧹 Lista limpiada", text_color="#74b9ff")

def update_counter():
    count = len(pdf_files)
    if count == 0:
        counter_label.configure(text="📄 No hay archivos en la lista")
    elif count == 1:
        counter_label.configure(text="📄 1 archivo en la lista")
    else:
        counter_label.configure(text=f"📄 {count} archivos en la lista")

def update_output_name():
    if pdf_files and not output_name_entry.get().strip():
        auto_name = f"PDFs_Unidos_{datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}.pdf"
        output_name_entry.delete(0, tk.END)
        output_name_entry.insert(0, auto_name)

def merge_pdfs():
    if not pdf_files:
        messagebox.showwarning("Atención", "No hay archivos PDF para unir.\n\nPrimero agrega archivos usando los botones de arriba o arrastrándolos.")
        return

    output_name = output_name_entry.get().strip()
    if not output_name:
        messagebox.showwarning("Atención", "Debes escribir un nombre para el PDF final.")
        return

    if not output_name.lower().endswith(".pdf"):
        output_name += ".pdf"

    output_path = os.path.join(os.getcwd(), output_name)
    
    if os.path.exists(output_path):
        result = messagebox.askyesno(
            "Archivo existente",
            f"El archivo '{output_name}' ya existe.\n¿Quieres reemplazarlo?"
        )
        if not result:
            return

    merger = PdfMerger()
    try:
        status_label.configure(text="⏳ Uniendo archivos...", text_color="#74b9ff")
        merge_btn.configure(state="disabled", text="Procesando...")
        app.update()
        
        for file in pdf_files:
            merger.append(file)
        merger.write(output_path)
        merger.close()
        
        status_label.configure(text="✅ ¡PDFs unidos exitosamente!", text_color="#00b894")
        merge_btn.configure(state="normal", text="✅ UNIR PDFs AHORA")
        
        result = messagebox.askyesno(
            "¡Éxito!",
            f"Los PDFs se unieron correctamente.\n\nArchivo creado:\n{output_name}\n\n¿Quieres abrir la carpeta donde se guardó?"
        )
        
        if result:
            open_folder(os.path.dirname(output_path))
            
    except Exception as e:
        status_label.configure(text="❌ Error al unir archivos", text_color="#ff7675")
        merge_btn.configure(state="normal", text="✅ UNIR PDFs AHORA")
        messagebox.showerror("Error", f"No se pudieron unir los PDFs.\n\nError técnico:\n{str(e)}")

def open_folder(path):
    try:
        if platform.system() == "Windows":
            os.startfile(path)
        elif platform.system() == "Darwin":
            subprocess.Popen(["open", path])
        else:
            subprocess.Popen(["xdg-open", path])
    except:
        messagebox.showinfo("Ubicación", f"El archivo se guardó en:\n{path}")

# --- Drag and drop en listbox ---
def on_drag_start(event):
    widget = event.widget
    widget.drag_start_index = widget.nearest(event.y)

def on_drag_motion(event):
    widget = event.widget
    i = widget.nearest(event.y)
    if i < widget.size():
        widget.selection_clear(0, tk.END)
        widget.selection_set(i)

def on_drag_drop(event):
    widget = event.widget
    drag_end_index = widget.nearest(event.y)
    start = getattr(widget, "drag_start_index", None)
    if start is not None and drag_end_index != start:
        pdf_files.insert(drag_end_index, pdf_files.pop(start))
        text = widget.get(start)
        widget.delete(start)
        widget.insert(drag_end_index, text)
        widget.selection_clear(0, tk.END)
        widget.selection_set(drag_end_index)
        status_label.configure(text="↕️ Orden actualizado", text_color="#74b9ff")

# --- Interfaz ---

# Header con botón de ayuda
header_frame = ctk.CTkFrame(app, fg_color="transparent")
header_frame.pack(fill="x", padx=20, pady=(15, 5))

title = ctk.CTkLabel(
    header_frame,
    text="📑 Unir Archivos PDF",
    font=ctk.CTkFont(size=26, weight="bold")
)
title.pack(side="left")

help_btn = ctk.CTkButton(
    header_frame,
    text="❓ Ayuda",
    command=show_help,
    width=100,
    height=35,
    fg_color="#6c5ce7",
    hover_color="#5f4dd1",
    font=ctk.CTkFont(size=13, weight="bold")
)
help_btn.pack(side="right")

desc = ctk.CTkLabel(
    app,
    text="Arrastra archivos/carpetas aquí o usa los botones para agregarlos",
    font=ctk.CTkFont(size=14),
    text_color="gray70"
)
desc.pack(pady=(0, 15))

# Paso 1
step1_label = ctk.CTkLabel(
    app,
    text="PASO 1: Agrega tus archivos PDF",
    font=ctk.CTkFont(size=15, weight="bold"),
    anchor="w"
)
step1_label.pack(fill="x", padx=20, pady=(5, 5))

btn_frame = ctk.CTkFrame(app, fg_color="transparent")
btn_frame.pack(pady=5)

ctk.CTkButton(
    btn_frame,
    text="📄 Agregar PDFs",
    command=add_pdfs,
    width=170,
    height=38,
    font=ctk.CTkFont(size=13, weight="bold")
).grid(row=0, column=0, padx=5)

ctk.CTkButton(
    btn_frame,
    text="📁 Agregar Carpeta",
    command=add_folder,
    width=170,
    height=38,
    font=ctk.CTkFont(size=13, weight="bold")
).grid(row=0, column=1, padx=5)

# Paso 2
step2_label = ctk.CTkLabel(
    app,
    text="PASO 2: Organiza el orden (doble clic para vista previa)",
    font=ctk.CTkFont(size=15, weight="bold"),
    anchor="w"
)
step2_label.pack(fill="x", padx=20, pady=(15, 5))

counter_label = ctk.CTkLabel(
    app,
    text="📄 No hay archivos en la lista",
    font=ctk.CTkFont(size=13),
    text_color="gray60"
)
counter_label.pack()

# Drop zone visual
drop_zone = ctk.CTkFrame(app, height=220, corner_radius=10, border_width=2, border_color="#4a4a4a")
drop_zone.pack(fill="both", padx=20, pady=10)
drop_zone.pack_propagate(False)

list_frame = tk.Frame(drop_zone, bg="#2b2b2b")
list_frame.pack(fill="both", expand=True, padx=2, pady=2)

scrollbar = tk.Scrollbar(list_frame)
scrollbar.pack(side="right", fill="y")

listbox = tk.Listbox(
    list_frame,
    bg="#2b2b2b",
    fg="white",
    selectbackground="#1f538d",
    activestyle="none",
    highlightthickness=0,
    bd=0,
    font=("Segoe UI", 12)
)
listbox.pack(side="left", fill="both", expand=True)
scrollbar.config(command=listbox.yview)
listbox.config(yscrollcommand=scrollbar.set)

# Configurar drag and drop
listbox.drop_target_register(DND_FILES)
listbox.dnd_bind('<<Drop>>', drop_files)

listbox.bind("<ButtonPress-1>", on_drag_start)
listbox.bind("<B1-Motion>", on_drag_motion)
listbox.bind("<ButtonRelease-1>", on_drag_drop)
listbox.bind("<Double-Button-1>", show_preview)

# Botones de gestión
manage_frame = ctk.CTkFrame(app, fg_color="transparent")
manage_frame.pack(pady=5)

ctk.CTkButton(
    manage_frame,
    text="❌ Eliminar Seleccionado",
    command=remove_selected,
    width=170,
    height=32,
    fg_color="#e17055",
    hover_color="#d63031",
    font=ctk.CTkFont(size=12)
).grid(row=0, column=0, padx=5)

ctk.CTkButton(
    manage_frame,
    text="🗑️ Limpiar Todo",
    command=clear_list,
    width=170,
    height=32,
    fg_color="#636e72",
    hover_color="#2d3436",
    font=ctk.CTkFont(size=12)
).grid(row=0, column=1, padx=5)

# Paso 3
step3_label = ctk.CTkLabel(
    app,
    text="PASO 3: Escribe el nombre del archivo final",
    font=ctk.CTkFont(size=15, weight="bold"),
    anchor="w"
)
step3_label.pack(fill="x", padx=20, pady=(15, 5))

output_name_entry = ctk.CTkEntry(
    app,
    width=500,
    height=40,
    placeholder_text="Ejemplo: Mis_Documentos_Unidos.pdf",
    font=ctk.CTkFont(size=13)
)
output_name_entry.pack(pady=5)

# Paso 4
step4_label = ctk.CTkLabel(
    app,
    text="PASO 4: Haz clic para unir",
    font=ctk.CTkFont(size=15, weight="bold"),
    anchor="w"
)
step4_label.pack(fill="x", padx=20, pady=(15, 5))

merge_btn = ctk.CTkButton(
    app,
    text="✅ UNIR PDFs AHORA",
    command=merge_pdfs,
    fg_color="#00b894",
    hover_color="#019875",
    font=ctk.CTkFont(size=17, weight="bold"),
    width=350,
    height=50,
    corner_radius=10
)
merge_btn.pack(pady=10)

# Barra de estado
status_label = ctk.CTkLabel(
    app,
    text="👋 Bienvenido. Arrastra archivos aquí o haz clic en 'Ayuda'",
    font=ctk.CTkFont(size=12),
    text_color="gray60"
)
status_label.pack(pady=5)

app.mainloop()